# vscode-ai README

A simple extension that creates a chatbot as a Webview view, using an ollama model based chatbot running locally.

## Requirements

[ollama](https://ollama.com/download) needs to be installed with at least one [model](https://ollama.com/search) present.
The better your system configuration, the more powerful the model you can run. 
Start with lighter models and test heavier models as you go. For example, the lightest model, [deepseek-r1:1.5b](https://ollama.com/library/deepseek-r1:1.5b) can be downloaded using 

```ollama run deepseek-r1:1.5b```

which should then show up in the extension.
> The above command takes time based on the model selected. See [ollama models](https://ollama.com/search) for more information.

## Features
Once a model is installed, you can ask simple questions to it from within vscode. Useful for simple code based questions. More sophisticated models are more capable of course, but are slower to respond, based on your system configuration. The lighter deepseek models are still impressive, since they are distilled with information from heavier models using fine-tuning.

## Extension Settings

This extension contributes a webview view `AIChat.aiView`.

## Known Issues

For now, there is no RAG and     internet search. Might add in the future.

## Release Notes

### 1.0.0

Initial release
