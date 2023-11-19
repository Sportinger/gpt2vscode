import * as vscode from 'vscode';
import { OpenAI } from 'openai';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "gpt2vscode" is now active!');

  let disposable = vscode.commands.registerCommand('gpt2vscode.sendToGPT', async () => {
    const content = getViewportContent();
    if (content) {
      const response = await sendToGPT(content);
      displayInNewTab(response);
    } else {
      vscode.window.showErrorMessage('No content found in the current viewport.');
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getViewportContent(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const range = new vscode.Range(
      editor.visibleRanges[0].start,
      editor.visibleRanges[0].end
    );
    return editor.document.getText(range);
  }
  return undefined;
}

async function sendToGPT(content: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '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', // Replace with your OpenAI API key
  });

  try {
    const response = await openai.completions.create({
      model: 'text-davinci-003', // Replace with your desired model
      prompt: content,
      max_tokens: 150,
    });
    return response.choices[0].text.trim();
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    return 'Error: Could not get a response from OpenAI.';
  }
}

async function displayInNewTab(response: string) {
  const document = await vscode.workspace.openTextDocument({
    content: response,
    language: 'text' // You can specify the language or leave it as 'text'
  });
  await vscode.window.showTextDocument(document, {
    preview: false, // This will open the document as a permanent tab that won't be replaced
    viewColumn: vscode.ViewColumn.Beside // This will open the document to the side of the current one
  });
}