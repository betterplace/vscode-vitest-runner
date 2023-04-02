import * as vscode from "vscode";
import * as path from "path";

function buildVitestArgs(...args: string[]) {
  return ["vitest", "run", "-t", ...args];
}

function buildCdArgs(path: string) {
  return ["cd", path];
}

export function findWorkspaceRoot(filename: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }
  const workspaceFolder = workspaceFolders.find(folder =>
    filename.startsWith(folder.uri.fsPath)
  );
  if (!workspaceFolder) {
    return;
  }
  return workspaceFolder.uri.fsPath;
}

export function findProjectRoot(filename: string) {
  const workspaceRoot = findWorkspaceRoot(filename);
  if (!workspaceRoot) {
    return;
  }
  const gitRoot = vscode.workspace
    .getConfiguration("git", vscode.Uri.file(workspaceRoot))
    .get<string | undefined>("path");
  if (!gitRoot) {
    return;
  }
  return path.join(workspaceRoot, gitRoot);
}

export function findFilePathRelativeToRoot(
  projectRootPath: string,
  filename: string
) {
  if (!projectRootPath) {
    return path.dirname(filename);
  }
  return path.relative(projectRootPath, filename);
}

export function getRootAndCasePath(filename: string) {
  const casePath = path.dirname(filename);
  const projectRootPath = findProjectRoot(filename) ?? casePath;
  const casePathRelativeToRoot = findFilePathRelativeToRoot(
    projectRootPath,
    filename
  );
  return {
    projectRootPath,
    casePathRelativeToRoot,
  };
}

export function runInTerminal(text: string, filename: string) {
  const { projectRootPath, casePathRelativeToRoot } =
    getRootAndCasePath(filename);
  const terminal = vscode.window.createTerminal(`vitest - ${text}`);

  const casePathStr = JSON.stringify(casePathRelativeToRoot);
  const caseNameStr = JSON.stringify(text);

  const cdArgs = buildCdArgs(projectRootPath);
  terminal.sendText(cdArgs.join(" "), true);

  const vitestArgs = buildVitestArgs(casePathStr, caseNameStr);
  const runnerArgs = ["pnpx", ...vitestArgs];
  terminal.sendText(runnerArgs.join(" "), true);
  terminal.show();
}

function buildDebugConfig(
  cwd: string,
  casePath: string,
  text: string
): vscode.DebugConfiguration {
  return {
    name: "Debug vitest case",
    request: "launch",
    runtimeArgs: buildVitestArgs(casePath, text),
    cwd,
    runtimeExecutable: "pnpx",
    skipFiles: ["<node_internals>/**"],
    type: "pwa-node",
    console: "integratedTerminal",
    internalConsoleOptions: "neverOpen",
  };
}

export function debugInTermial(text: string, filename: string) {
  const { projectRootPath, casePathRelativeToRoot } =
    getRootAndCasePath(filename);
  const config = buildDebugConfig(
    projectRootPath,
    casePathRelativeToRoot,
    text
  );
  vscode.debug.startDebugging(undefined, config);
}
