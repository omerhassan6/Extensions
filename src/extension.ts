import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "helloworld" is now active!');

	const disposable = vscode.commands.registerCommand('helloworld.helloWorld', async () => {
		try {
			const title = await vscode.window.showInputBox({
				prompt: 'Enter a bug title',
				placeHolder: 'Example: Login button misaligned on mobile view',
				ignoreFocusOut: true
			});

			if (!title) {
				vscode.window.showWarningMessage('Bug report creation was canceled.');
				return;
			}

			const description = await vscode.window.showInputBox({
				prompt: 'Enter a short description of the issue',
				placeHolder: 'What is happening and where',
				ignoreFocusOut: true
			});

			const severity = await vscode.window.showQuickPick(['Low', 'Medium', 'High', 'Critical'], {
				placeHolder: 'Select the bug severity',
				ignoreFocusOut: true
			});

			if (!severity) {
				vscode.window.showWarningMessage('Bug report creation was canceled.');
				return;
			}

			const report = {
				title,
				description: description || 'No additional description provided.',
				severity,
				timestamp: new Date().toLocaleString()
			};

			vscode.window.showInformationMessage(
				`Bug report created: ${report.title} (${report.severity})`,
				{ modal: false }
			);
		} catch (error) {
			console.error('Failed to create bug report', error);
			vscode.window.showErrorMessage('Failed to create bug report.');
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}