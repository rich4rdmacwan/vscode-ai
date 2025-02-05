// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama, { ListResponse } from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ai" is now active!');

	const provider = new DeepseekViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DeepseekViewProvider.viewType, provider));

}

// This method is called when your extension is deactivated
export function deactivate() { }


class DeepseekViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'DeepseekChat.deepseekView';

	private _view?: vscode.WebviewView;
	private cancellationTokenSource?: vscode.CancellationTokenSource; // Store the current token source

	private _model?:string;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	async loadModels(webview: vscode.Webview) {
		// Load existing ollama models
		try {
			const value = await ollama.list();

			const rdoBtnStrPrefix = "<label class='modelButton' onclick='selectModel(this)'>" +
				"<input type='radio' name='modelButton' ";
			const rdoBtnStrSuffix = "</label>&nbsp;";
			let rdoBtnsStr = "";

			let i = 0;
			value.models.forEach(model => {
				rdoBtnsStr += rdoBtnStrPrefix ;
				// Select first model as default
				if(i++ === 0){
					this._model = model.name;
					rdoBtnsStr += "checked=checked ";
				}
				rdoBtnsStr += ">" + model.name + rdoBtnStrSuffix;
			});
			

			webview.postMessage({ command: 'modelsLoaded', text: `${rdoBtnsStr}` });
			console.log(rdoBtnsStr);
		}
		catch (error) {
			console.error('Promise rejected with error: ' + error);
		}
	}

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

		this.loadModels(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === 'chat') {
				const userPrompt = message.text;
				let responseText = '';
				// Ensure that a fresh CancellationTokenSource is created for each new chat request
				if (this.cancellationTokenSource) {
					// If a cancellation token exists, cancel it before starting a new chat
					this.cancellationTokenSource.cancel();
				}
				// Create a new token source for this chat request
				this.cancellationTokenSource = new vscode.CancellationTokenSource();

				const token = this.cancellationTokenSource.token;
				
				try {
					const streamResponse = await ollama.chat({
						model: this._model!,
						messages: [{ role: 'user', content: userPrompt }],
						stream: true
					});


					for await (const part of streamResponse) {
						// Check if cancellation is requested
						if (token.isCancellationRequested) {
							// webviewView.webview.postMessage({command: 'chatResponse', text: "cancelling"});
							break;  // Exit the loop if cancellation is requested
						}
						responseText += part.message.content;
						webviewView.webview.postMessage({ command: 'chatResponse', text: responseText });
					}
					webviewView.webview.postMessage({ command: 'responseEnd', text: "" });
				} catch (err) {
					var errstr = String(err);
					if (errstr.includes("fetch failed")) {
						errstr += ".<br>Maybe the ollama server is not running? " +
							"Run<br> ```systemctl start ollama``` <br> or <br>```ollama serve``` <br>in a terminal.";
					}
					webviewView.webview.postMessage({ command: 'responseEnd', text: `Error: ${errstr}` });
				}
			}
			if (message.command === 'cancel') {
				if (this.cancellationTokenSource) {
					this.cancellationTokenSource.cancel();  // Cancel the task
					// webviewView.webview.postMessage({ command: 'chatResponse', text: 'Task canceled.' });
				}
			}

			if (message.command === 'modelSelected') {
				this._model = message.text;
			}

		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));


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
		<div id="modelButtons">abc</div>
		<div style="display:block">
		<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea><br/>
		<button class="buttonAsk" id="askBtn"><span style='display:none;padding:4px;' id='loadinggif' class='fa fa-circle-o-notch fa-spin'></span>Ask</button>
		</div>
	
		<div class="response" id="response">
			<!-- Prose content will go here -->
		</div>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>		
		<script>
			const buttonHTML = "<span style='display:none;padding:4px;' id='loadinggif' class='fa fa-circle-o-notch fa-spin'></span>Ask";
			const vscode = acquireVsCodeApi();

			function selectModel(obj) {
				<!-- document.getElementById('response').innerHTML = obj.innerHTML; -->
				<!-- vscode.postMessage({command: 'modelSelected', obj.innerHTML}); -->				
			}

			document.getElementById('askBtn').addEventListener('click', () => {							
				const text = document.getElementById('prompt').value;
				
				var innerHTML = document.getElementById('askBtn').innerHTML;
				if(innerHTML.indexOf("Ask")!=-1){
					document.getElementById('askBtn').innerHTML = innerHTML.replace("Ask", "Thinking...");
					document.getElementById('loadinggif').style.display = "inline-block";
					vscode.postMessage({command: 'chat', text});
				}else{
					document.getElementById('askBtn').innerHTML = buttonHTML;
					vscode.postMessage({command: 'cancel'});
				}
				
				});
			
			window.addEventListener('message', event => {
				const {command,  text} = event.data;
				if (command === 'chatResponse'){
					var innerHTML = document.getElementById('askBtn').innerHTML;
					document.getElementById('askBtn').innerHTML = innerHTML.replace("Thinking...", "Replying...");
					document.querySelector(".buttonAsk").querySelector("#loadinggif").style.display = "none"
					document.getElementById('response').innerHTML = marked.parse(text);
					hljs.highlightAll();
					}
				
				if (command === 'responseEnd'){
					var innerHTML = document.getElementById('askBtn').innerHTML;				
					document.getElementById('askBtn').innerHTML = buttonHTML;
					document.querySelector(".buttonAsk").querySelector("#loadinggif").style.display = "none"
					if(text !== ''){
						document.getElementById('response').innerHTML = marked.parse(text);
					}					
				}

				if (command === 'modelsLoaded'){
					document.getElementById('modelButtons').innerHTML = text;
				}

				
				});
		</script>
	</body>
	</html>
	`;
	}
}