// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ai" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('vscode-ai.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from vscode-ai!');
	// });

	// const disposable = vscode.commands.registerCommand("vscode-ai.start", () => {
	// 	const panel = vscode.window.createWebviewPanel(
	// 		'deepchat',
	// 		'DeepSeek Chat',
	// 		vscode.ViewColumn.One,
	// 		{enableScripts: true}
	// 	);
	// 	panel.webview.html = getWebViewContent();
		
		
	// 	panel.webview.onDidReceiveMessage(async (message:any) => {
	// 		if(message.command === 'chat'){
	// 			const userPrompt = message.text;
	// 			let responseText = '';
	// 			try {					
	// 				const streamResponse = await ollama.chat({
	// 					model: 'deepseek-r1:1.5b',
	// 					messages: [{role: 'user', content: userPrompt}],
	// 					stream: true
	// 				});
					
	// 				for await (const part of streamResponse){
	// 					responseText += part.message.content;
	// 					panel.webview.postMessage({command: 'chatResponse', text: responseText});
	// 				}
	// 			} catch(err){
	// 				panel.webview.postMessage({command: 'chatResponse', text: `Error: ${String(err)}`});
	// 			}
	// 		}
	// 	});

	// });
	
	// context.subscriptions.push(disposable);
	const provider = new DeepseekViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DeepseekViewProvider.viewType, provider));

}

// This method is called when your extension is deactivated
export function deactivate() {}


class DeepseekViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'DeepseekChat.deepseekView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (message:any) => {
				if(message.command === 'chat'){
				const userPrompt = message.text;
				let responseText = '';
				try {					
					const streamResponse = await ollama.chat({
						model: 'deepseek-r1:1.5b',
						messages: [{role: 'user', content: userPrompt}],
						stream: true
					});
					
					for await (const part of streamResponse){
						responseText += part.message.content;
						postMessage({command: 'chatResponse', text: responseText});
					}
				} catch(err){
					postMessage({command: 'chatResponse', text: `Error: ${String(err)}`});
				}
			}
		
		});
	}

	public addColor() {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		// const nonce = getNonce();

		return /*html*/`
	<!DOCTYPE html>
	<html lang="en>
	<head>
		<meta charset="UTF-8" />			
		<!--
			Use a content security policy to only allow loading styles from our extension directory,
			and only allow scripts that have a specific nonce.
			(See the 'webview-sample' extension sample for img-src content security policy examples)			
		-->
		

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link href="${styleResetUri}" rel="stylesheet">
		<link href="${styleVSCodeUri}" rel="stylesheet">
		<link href="${styleMainUri}" rel="stylesheet">
		<!--
		<style>
		body { font-family: sans serif; margin: 1rem; }
		#prompt { width: 100%; box-sizing: border-box;font-size: 32px; border-radius: 10px;}
		#response {display:block; border: 1px solid #ccc; margin-top: 1rem; padding: @.5rem; font-size:24px;border-radius: 10px;}
		</style>
		-->
	</head>
	<body>
		<h3> Deep Vs code extension </h3>
		<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea><br/>
		<button id="askBtn">Ask</button>
		<md-block id="response"></md-block>
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>		
		<script>
			const vscode = acquireVsCodeApi();
			document.getElementById('askBtn').addEventListener('click', () => {
				const text = document.getElementById('prompt').value;
				vscode.postMessage({command: 'chat', text});
				});
			
			window.addEventListener('message', event => {
				const {command,  text} = event.data;
				if (command === 'chatResponse'){
					document.getElementById('response').innerHTML = marked.parse(text);
					}
				
				});
		</script>
	</body>
	</html>
	`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}