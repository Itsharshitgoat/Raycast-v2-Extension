import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { execSync, spawn } from "child_process";
import { StorageKey } from "./storage";

export default async function Command() {
  const raw = await LocalStorage.getItem<string>(StorageKey.preventSleepEnabled);
  const currentlyEnabled = raw === "true";

  const newState = !currentlyEnabled;

  try {
    if (newState) {
      // Prevent system sleep via pmset
      execSync("sudo pmset -a disablesleep 1", { timeout: 10000 });

      // Prevent display sleep via caffeinate -d (runs in background)
      const caffeinate = spawn("caffeinate", ["-d"], {
        detached: true,
        stdio: "ignore",
      });
      caffeinate.unref();

      // Store the PID so we can kill it later
      if (caffeinate.pid) {
        await LocalStorage.setItem(StorageKey.caffeinatePid, String(caffeinate.pid));
      }
    } else {
      // Re-enable normal sleep via pmset
      execSync("sudo pmset -a disablesleep 0", { timeout: 10000 });

      // Kill the caffeinate process we started
      const storedPid = await LocalStorage.getItem<string>(StorageKey.caffeinatePid);
      if (storedPid) {
        try {
          process.kill(Number(storedPid));
        } catch {
          // Process may have already exited — that's fine
        }
        await LocalStorage.removeItem(StorageKey.caffeinatePid);
      }

      // Also kill any stray caffeinate processes just in case
      try {
        execSync("pkill -f 'caffeinate -d'", { timeout: 5000 });
      } catch {
        // No caffeinate processes running — that's fine
      }
    }

    await LocalStorage.setItem(StorageKey.preventSleepEnabled, String(newState));

    await closeMainWindow({ clearRootSearch: true });

    if (newState) {
      await showHUD("Mac will stay awake");
    } else {
      await showHUD("Normal sleep restored");
    }
  } catch (error) {
    await showHUD("Mission Failed");
  }
}
