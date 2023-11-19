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
            const userMessage = await vscode.window.showInputBox({
                prompt: 'Enter a message to send to GPT along with the content',
                placeHolder: 'Type your message here...'
            });
            if (userMessage !== undefined) {
                const problems = getProblems();
                await sendToGPT(content, problems, userMessage);
            }
        }
        else {
            vscode.window.showErrorMessage('No content found in the current viewport.');
        }
    });
    // Register the command that applies the edit
    let applyEditCommand = vscode.commands.registerCommand('gpt2vscode.applyEdit', (args) => {
        applyEdit(args.line, args.newText);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function getViewportContent() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        let contentWithLineNumbers = '';
        const fullRange = editor.document.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
        for (let i = fullRange.start.line; i <= fullRange.end.line; i++) {
            const lineText = editor.document.lineAt(i).text;
            contentWithLineNumbers += `${i + 1}: ${lineText}\n`; // Adding 1 because line numbers are 0-based in the editor
        }
        return contentWithLineNumbers;
    }
    return undefined;
}
function getProblems() {
    const allDiagnostics = vscode.languages.getDiagnostics();
    let problems = '';
    for (const [uri, diagnostics] of allDiagnostics) {
        for (const diagnostic of diagnostics) {
            problems += `${uri.path}: ${diagnostic.message}\n`;
        }
    }
    return problems;
}
async function sendToGPT(content, problems, userMessage) {
    const openai = new openai_1.OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'INPUT_YOUR_API_KEY', // Replace with your OpenAI API key
    });
    try {
        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4-1106-preview',
            messages: [
                { role: 'system', content: 'You are an advanced coding assistant tasked with providing precise and actionable code edits. When analyzing code snippets, error messages, and user inputs, your response should specifically identify complete lines that require replacement. ' },
                { role: 'user', content: content },
                { role: 'user', content: problems },
                { role: 'user', content: userMessage },
                { role: 'user', content: 'Adopt the format //REPLACE Line X: "new code" for each edit suggestion. "X" represents the line number. Crucially, include the exact indentation (spaces or tabs) used at the beginning of the line being replaced. Enclose the new code in double quotes and ensure it includes this leading indentation, so it aligns correctly when implemented. Focus solely on the lines needing changes, and exclude surrounding unchanged code..' }
            ],
            temperature: 0,
            max_tokens: 4000, // Add the max_tokens parameter
        });
        const response = chatCompletion.choices[0].message.content.trim();
        applyEditsAndHighlight(response);
        displayInNewTab(response); // Display the full response in a new tab
    }
    catch (error) {
        console.error('Error communicating with OpenAI:', error);
        vscode.window.showErrorMessage('Error: Could not get a response from OpenAI.');
    }
}
async function applyEditsAndHighlight(response) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }
    const editRegex = /\/\/REPLACE Line (\d+): "([^"]*)"/gm;
    let match;
    while ((match = editRegex.exec(response)) !== null) {
        const line = parseInt(match[1], 10) - 1; // Line numbers in the editor are 0-based
        const newText = match[2];
        // Create a decoration type for highlighting
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255,0,0,0.3)',
            isWholeLine: true,
        });
        // Create a range for the line to be replaced
        const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);
        // Create a hover message with a command link
        const hoverMessage = new vscode.MarkdownString(`[Click to apply edit](command:gpt2vscode.applyEdit?${encodeURIComponent(JSON.stringify({ line, newText }))})`);
        hoverMessage.isTrusted = true; // Allows command URIs in the markdown
        // Create a decoration with the hover message
        const decoration = { range: range, hoverMessage: hoverMessage };
        editor.setDecorations(decorationType, [decoration]);
    }
}
// Function to apply the edit when the command is executed
async function applyEdit(line, newText) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }
    // Replace the entire line with the new text
    const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);
    await editor.edit((editBuilder) => {
        editBuilder.replace(range, newText);
    });
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