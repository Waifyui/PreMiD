import { spawn } from "child_process";
import { resolve as pResolve } from "path";
import { error, info } from "./debug";
import { trayContextMenu } from "../managers/trayManager";
import { MenuItem, app } from "electron";
import { tray } from "../managers/trayManager";
import { platform } from "os";
import { updateCheckerInterval } from "../index";
var sudoPrompt = require("sudo-prompt");

var updaterPath: string;

export async function checkForUpdate(autoUpdate = false) {
  //TODO REDO AUTOUPDATER!!
  if (!app.isPackaged) {
    info("Skipping UpdateChecker");
    return;
  }

  switch (platform()) {
    case "darwin":
      updaterPath = app.isPackaged
        ? pResolve(
            "/Applications/PreMiD/updater.app/Contents/MacOS/installbuilder.sh"
          )
        : pResolve("./updater.app/Contents/MacOS/installbuilder.sh");
      break;
    case "win32":
      updaterPath = pResolve("./updater.exe");
      break;
  }

  var child = spawn(updaterPath, ["--mode", "unattended"]);

  child.on("error", err => {
    // @ts-ignore
    if (err.code === "ENOENT") {
      error("Updater file not found. Skipping updater functions.");
      clearInterval(updateCheckerInterval);
      return;
    }
  });

  child.on("exit", code => {
    //* If no update return
    if (code === 1) {
      info("Up to date!");
      return;
    }

    //* If autoUpdate == true
    if (autoUpdate) {
      update();
      return;
    }

    if (trayContextMenu.items.length < 3) {
      trayContextMenu.insert(
        0,
        new MenuItem({
          label: "Update available!",
          click() {
            update();
          }
        })
      );

      trayContextMenu.insert(
        1,
        new MenuItem({
          type: "separator"
        })
      );
      tray.setContextMenu(trayContextMenu);
    }
  });
}

export function update() {
  sudoPrompt.exec(
    `${updaterPath} --mode unattended --unattendedmodebehavior download`,
    {
      name: app.getName()
    },
    (error: Error) => {
      if (error) {
        checkForUpdate();
        return;
      }
    }
  );
}
