import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TERMINAL } from './enums';

function buildVitestArgs(...args: string[]) {
    const [path, ...rest] = args;
    return ['vitest', 'run', '--dir', path, '-t', ...rest];
}

function buildCdArgs(path: string) {
    return ['cd', path];
}

function getExecutionArg() {
    const config = vscode.workspace.getConfiguration('VitestRunner');
    return config.get<string>('executionArg');
}

function getVitestTerminalOrNew() {
    const vitestTerminal = vscode.window.terminals.find(
        terminal => terminal.name === TERMINAL.Name
    );

    if (vitestTerminal) {
        return vitestTerminal;
    }

    return vscode.window.createTerminal(TERMINAL.Name);
}

export function findProjectRoot(filename: string) {
    let packageJsonPath: string | undefined;
    let dir = path.dirname(filename);
    while (dir !== path.dirname(dir)) {
        const testPath = path.join(dir, 'package.json');
        if (fs.existsSync(testPath)) {
            packageJsonPath = testPath;
            break;
        }
        dir = path.dirname(dir);
    }
    if (!packageJsonPath) throw new Error('Could not find package.json!');
    return path.dirname(packageJsonPath);
}

export function getFilePathRelativeToRoot(
    projectRootPath: string,
    filename: string
) {
    if (!projectRootPath) {
        return path.dirname(filename);
    }
    return path.dirname(path.relative(projectRootPath, filename));
}

export function getRootAndCasePath(filename: string) {
    const projectRootPath = findProjectRoot(filename);
    const casePathRelativeToRoot = getFilePathRelativeToRoot(
        projectRootPath,
        filename
    );
    return {
        projectRootPath,
        casePathRelativeToRoot
    };
}

export function escapePath(path: string) {
    return path.replace(/[*+?^${}()[\]\s\\]/g, '\\$&');
}

export function runInTerminal(text: string, filename: string) {
    const { projectRootPath, casePathRelativeToRoot } =
        getRootAndCasePath(filename);

    const terminal = getVitestTerminalOrNew();

    const caseNameStr = JSON.stringify(text);

    const cdArgs = buildCdArgs(projectRootPath);
    terminal.sendText(cdArgs.join(' '), true);

    const vitestArgs = buildVitestArgs(
        escapePath(casePathRelativeToRoot),
        caseNameStr
    );
    const executionArg = getExecutionArg();

    const runnerArgs = [executionArg, ...vitestArgs];
    terminal.sendText(runnerArgs.join(' '), true);
    terminal.show();
}

function buildDebugConfig(
    cwd: string,
    casePath: string,
    text: string
): vscode.DebugConfiguration {
    return {
        name: 'Debug vitest case',
        request: 'launch',
        runtimeArgs: buildVitestArgs(casePath, text),
        cwd,
        runtimeExecutable: getExecutionArg(),
        skipFiles: ['<node_internals>/**'],
        type: 'pwa-node',
        console: 'integratedTerminal',
        internalConsoleOptions: 'neverOpen'
    };
}

export function debugInTerminal(text: string, filename: string) {
    const { projectRootPath, casePathRelativeToRoot } =
        getRootAndCasePath(filename);
    const config = buildDebugConfig(
        projectRootPath,
        casePathRelativeToRoot,
        text
    );
    vscode.debug.startDebugging(undefined, config);
}
