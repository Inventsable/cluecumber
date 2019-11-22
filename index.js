let fspath = require("path");
let spy = require("cep-spy").default;
let fs = require("fs");

// Opens a native open dialog and returns the target folder/file path as obj.path
function openDialog(title) {
  let menu = cep.fs.showOpenDialogEx(true, true, title);
  return menu.err
    ? { err: menu.err, path: null }
    : menu.data.length
    ? { err: null, path: fspath.resolve(menu.data[0]) }
    : { err: "Canceled", path: null };
}

// Opens a native save dialog and returns the target file
// This should append file type, but currently does not
function saveDialog(title, filetypes) {
  let menu = cep.fs.showSaveDialogEx(title, null, filetypes);
  return menu.err
    ? { err: menu.err, path: null }
    : menu.data.length
    ? { err: null, path: fspath.resolve(menu.data) }
    : { err: "Canceled", path: null };
}

// Promisified wrapper around CSInterface.evalScript
// Returns a promise/thenable object which is pre-parsed if JSON
async function evalScript(text) {
  return new Promise((resolve, reject) => {
    window.__adobe_cep__.evalScript(`${text}`, res => {
      if (res) resolve(isJson(res) ? JSON.parse(res) : res);
      else reject("Error");
    });
  });
}

// Loads/executes .jsx script into memory from any path
function loadScript(path) {
  // Correctly execute regardless of whether Animate or regular CEP app
  if (!/FLPR/.test(spy.appName))
    window.__adobe_cep__.evalScript(`$.evalFile('${fspath.resolve(path)}')`);
  else
    window.__adobe_cep__.evalScript(
      `fl.runScript(FLfile.platformPathToURI("${fspath.resolve(path)}"))`
    );
}

// Determine if the current String is JSON notation
function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// Should get this working -- native CSEvent dispatch and listeners
// Currently requires CSInterface be preloaded for CSEvent class
function dispatchEvent(name, data) {
  var event = new CSEvent(name, "APPLICATION");
  event.data = data;
  window.__adobe_cep__.dispatchEvent(event);
}

// Should replace this with node's native fs to port into future UXP framework
function makeDir(root) {
  window.cep.fs.readFile(decodeURI(root).replace(/file\:\/{1,}/, "")).err
    ? new Promise((resolve, reject) => {
        window.__adobe_cep__.evalScript(
          `var folder = new Folder(${decodeURI(root)});
          if (!folder.exists) {
            var parts = root.split("/");
            parts.pop();
            mkdir(parts.join("/"));
            folder.create();
          }`,
          resolve("Done")
        );
      }).catch(err => {
        reject(err);
      })
    : null;
}

async function readDir(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(fspath.resolve(path), { encoding: "utf-8" }, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });
}

async function writeFile(path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fspath.resolve(path), data, err => {
      if (err) reject(err);
      resolve(true);
    });
  });
}

// Exports all functions needed to be imported from another file.
// Any of these functions can be imported via:
//   import { openDialog, saveDialog } from 'cluecumber'
export {
  openDialog,
  saveDialog,
  loadScript,
  evalScript,
  makeDir,
  readDir,
  writeFile,
  dispatchEvent
};
