//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
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
}());


