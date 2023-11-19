"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const openai_1 = require("openai");
function activate(context) {
    console.log('Congratulations, your extension "gpt2vscode" is now active!');
    let disposable = vscode.commands.registerCommand('gpt2vscode.sendToGPT', async () => {
        const content = getViewportContent();
        if (content) {
            const response = await sendToGPT(content);
            displayInNewTab(response);
        }
        else {
            vscode.window.showErrorMessage('No content found in the current viewport.');
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function getViewportContent() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const range = new vscode.Range(editor.visibleRanges[0].start, editor.visibleRanges[0].end);
        return editor.document.getText(range);
    }
    return undefined;
}
async function sendToGPT(content) {
    const openai = new openai_1.OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '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', // Replace with your OpenAI API key
    });
    try {
        const response = await openai.completions.create({
            model: 'text-davinci-003',
            prompt: content,
            max_tokens: 150,
        });
        return response.choices[0].text.trim();
    }
    catch (error) {
        console.error('Error communicating with OpenAI:', error);
        return 'Error: Could not get a response from OpenAI.';
    }
}
async function displayInNewTab(response) {
    const document = await vscode.workspace.openTextDocument({
        content: response,
        language: 'text' // You can specify the language or leave it as 'text'
    });
    await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside // This will open the document to the side of the current one
    });
}
//# sourceMappingURL=extension.js.map