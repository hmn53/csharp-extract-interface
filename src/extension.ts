import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  generateInterfaceCode,
  updateClassToImplementInterface,
} from "./logic";

export function activate(context: vscode.ExtensionContext) {
  const extractInterfaceCommand = vscode.commands.registerCommand(
    "csharp.extractInterface",
    extractInterface
  );

  context.subscriptions.push(extractInterfaceCommand);

  // Register the CodeActionProvider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: "csharp", scheme: "file" },
      new ExtractInterfaceCodeActionProvider(),
      {
        providedCodeActionKinds:
          ExtractInterfaceCodeActionProvider.providedCodeActionKinds,
      }
    )
  );
}

class ExtractInterfaceCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.Refactor];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const lineText = document.lineAt(range.start.line).text;

    // Check if the line contains a class definition
    if (/public\s+class\s+\w+/.test(lineText)) {
      const action = new vscode.CodeAction(
        "Extract Interface",
        vscode.CodeActionKind.RefactorExtract
      );

      // Link this action to the csharp.extractInterface command
      action.command = {
        command: "csharp.extractInterface",
        title: "Extract Interface",
        arguments: [],
      };

      return [action];
    }

    return [];
  }
}

async function extractInterface() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return;
  }

  const document = editor.document;
  if (document.languageId !== "csharp") {
    vscode.window.showErrorMessage("This command only works for C# files.");
    return;
  }

  const text = document.getText();

  // Get the current file path and directory
  const currentFilePath = document.uri.fsPath;
  const currentDirectory = path.dirname(currentFilePath); // Directory of the class file
  const fileName = path.basename(currentFilePath, ".cs"); // File name without extension

  try {
    const { interfaceNameFromPrompt, interfaceCode, namespace } =
      await generateInterfaceWithNamespaceAndEditClass(text, fileName);

    if (!interfaceNameFromPrompt) {
      // User cancelled the input
      return;
    }

    const actualInterfaceName = path.basename(interfaceNameFromPrompt);
    const relativeInterfacePath = path.dirname(interfaceNameFromPrompt);

    const baseDirectory = path.dirname(document.uri.fsPath);
    const targetDirectory = path.resolve(baseDirectory, relativeInterfacePath);

    // Create target directory if it doesn't exist
    // vscode.workspace.fs.createDirectory handles recursive creation.
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDirectory));

    // Construct the new interface file path
    const interfacePath = path.join(
      targetDirectory,
      `${actualInterfaceName}.cs`
    );

    // Check if the file already exists
    if (fs.existsSync(interfacePath)) {
      vscode.window.showWarningMessage(
        `File "${actualInterfaceName}.cs" already exists in "${targetDirectory}". No file was created.`
      );
      return;
    }

    // Create the new file and write the interface code
    const interfaceUri = vscode.Uri.file(interfacePath);
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.createFile(interfaceUri, { ignoreIfExists: true });
    workspaceEdit.insert(
      interfaceUri,
      new vscode.Position(0, 0),
      interfaceCode
    );

    await vscode.workspace.applyEdit(workspaceEdit);

    // Modify the current file to implement the interface
    const updatedClassText = updateClassToImplementInterface(
      text,
      fileName, // class name remains the same
      actualInterfaceName // use the actual name for the interface
    );

    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount, 0)
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange, updatedClassText);
    await vscode.workspace.applyEdit(edit);

    // Show the interface file
    await vscode.window.showTextDocument(interfaceUri);

    vscode.window.showInformationMessage(
      `Interface ${actualInterfaceName} created successfully in "${targetDirectory}" and class updated to implement it.`
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(
      error.message || "Failed to generate interface."
    );
  }
}

async function generateInterfaceWithNamespaceAndEditClass(
  classText: string,
  currentFileName: string
): Promise<{
  interfaceNameFromPrompt: string | undefined; // Can be undefined if user cancels
  interfaceCode: string;
  namespace: string | null;
}> {
  // Extract the class name and default interface name
  const className = currentFileName.replace(".cs", "");
  const defaultInterfaceName = `I${className}`;

  // Prompt for interface name
  const interfaceNameFromPrompt = await vscode.window.showInputBox({
    prompt:
      "Enter the interface name (e.g., IMyService or ../Interfaces/IMyService)",
    value: defaultInterfaceName,
  });

  if (!interfaceNameFromPrompt) {
    // Return undefined for interfaceNameFromPrompt if user cancels
    return {
      interfaceNameFromPrompt: undefined,
      interfaceCode: "",
      namespace: null,
    };
  }

  const result = generateInterfaceCode(
    classText,
    interfaceNameFromPrompt,
    currentFileName
  );

  return {
    interfaceNameFromPrompt,
    interfaceCode: result.interfaceCode,
    namespace: result.namespace,
  };
}

function deactivate() {}

export { deactivate };
