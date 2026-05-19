const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");

const healthUrl = "http://localhost:8000/health";

function bin(name) {
  return path.join("node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
}

function checkHealth(timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get(healthUrl, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.on("error", () => resolve(false));
  });
}

async function waitForHealth(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (await checkHealth(1000)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function runNewman(extraArgs = []) {
  const result = spawnSync(
    bin("newman"),
    [
      "run",
      "postman/collections/team-iot.postman_collection.json",
      "-e",
      "postman/environments/team-iot_local.postman_environment.json",
      "--reporters",
      "cli,junit",
      "--reporter-junit-export",
      "reports/newman-report-local.xml",
      ...extraArgs,
    ],
    { stdio: "inherit", shell: true }
  );

  return result.status || 0;
}

(async () => {
  if (await checkHealth()) {
    console.log("Local service is available at http://localhost:8000. Running Newman against the real local service.");
    process.exit(runNewman());
  }

  console.log("Local service is not available at http://localhost:8000.");
  console.log("Starting Prism mock on port 8000 so the local environment can be exercised.");

  const prism = spawn(
    bin("prism"),
    ["mock", "contracts/team-iot.openapi.yaml", "-p", "8000", "--host", "127.0.0.1"],
    { stdio: "ignore", shell: true, windowsHide: true }
  );

  const cleanup = () => {
    if (prism && !prism.killed) prism.kill();
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  const ready = await waitForHealth();
  if (!ready) {
    cleanup();
    console.error("Prism mock did not become ready on http://localhost:8000.");
    process.exit(1);
  }

  const exitCode = runNewman(["--env-var", "localMode=prism-mock"]);
  cleanup();
  process.exit(exitCode);
})();
