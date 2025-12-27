import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  generateInterfaceCode,
  updateClassToImplementInterface,
  parseMethodFromLine,
  findImplementedInterfaces,
  addMethodToInterface,
} from "./logic";

export function activate(context: vscode.ExtensionContext) {
  // Register Extract Interface command
  const extractInterfaceCommand = vscode.commands.registerCommand(
    "csharp.extractInterface",
    extractInterface
  );
  context.subscriptions.push(extractInterfaceCommand);

  // Register Add Method to Interface command
  const addMethodToInterfaceCommand = vscode.commands.registerCommand(
    "csharp.addMethodToInterface",
    addMethodToInterfaceHandler
  );
  context.subscriptions.push(addMethodToInterfaceCommand);

  // Register the CodeActionProvider for all C# refactoring actions
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: "csharp", scheme: "file" },
      new CSharpCodeActionProvider(),
      {
        providedCodeActionKinds: CSharpCodeActionProvider.providedCodeActionKinds,
      }
    )
  );
}

/**
 * Unified CodeActionProvider for all C# refactoring actions
 */
class CSharpCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.Refactor];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const lineText = document.lineAt(range.start.line).text;
    const fullText = document.getText();

    // Extract Interface - triggers on class declaration
    if (/public\s+(?:partial\s+)?class\s+\w+/.test(lineText)) {
      const action = new vscode.CodeAction(
        "Extract Interface",
        vscode.CodeActionKind.RefactorExtract
      );
      action.command = {
        command: "csharp.extractInterface",
        title: "Extract Interface",
        arguments: [],
      };
      actions.push(action);
    }

    // Add Method to Interface - triggers on public method
    const method = parseMethodFromLine(lineText, fullText);
    if (method) {
      const interfaces = findImplementedInterfaces(fullText);
      if (interfaces.length > 0) {
        const action = new vscode.CodeAction(
          `Add '${method.name}' to Interface`,
          vscode.CodeActionKind.RefactorExtract
        );
        action.command = {
          command: "csharp.addMethodToInterface",
          title: "Add Method to Interface",
          arguments: [method, interfaces],
        };
        actions.push(action);
      }
    }

    return actions;
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

/**
 * Handler for adding a method to an interface
 */
async function addMethodToInterfaceHandler(
  method: { returnType: string; name: string; genericParams: string | null; parameters: string },
  interfaces: string[]
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return;
  }

  const document = editor.document;
  const currentDirectory = path.dirname(document.uri.fsPath);

  // If multiple interfaces, let user choose
  let targetInterface: string | undefined;
  if (interfaces.length === 1) {
    targetInterface = interfaces[0];
  } else {
    targetInterface = await vscode.window.showQuickPick(interfaces, {
      placeHolder: "Select the interface to add the method to",
    });
  }

  if (!targetInterface) {
    return; // User cancelled
  }

  // Find the interface file
  const interfaceFileName = `${targetInterface}.cs`;
  const interfaceFiles = await vscode.workspace.findFiles(
    `**/${interfaceFileName}`,
    "**/node_modules/**"
  );

  if (interfaceFiles.length === 0) {
    vscode.window.showErrorMessage(
      `Could not find interface file '${interfaceFileName}' in workspace.`
    );
    return;
  }

  // Use the first match, or let user choose if multiple
  let interfaceUri: vscode.Uri;
  if (interfaceFiles.length === 1) {
    interfaceUri = interfaceFiles[0];
  } else {
    const selected = await vscode.window.showQuickPick(
      interfaceFiles.map((f) => ({
        label: path.basename(f.fsPath),
        description: path.dirname(f.fsPath),
        uri: f,
      })),
      { placeHolder: "Multiple interface files found. Select one:" }
    );
    if (!selected) {
      return;
    }
    interfaceUri = selected.uri;
  }

  // Read the interface file
  const interfaceDocument = await vscode.workspace.openTextDocument(interfaceUri);
  const interfaceCode = interfaceDocument.getText();

  // Add the method to the interface
  const updatedInterfaceCode = addMethodToInterface(interfaceCode, method);

  if (updatedInterfaceCode === interfaceCode) {
    vscode.window.showInformationMessage(
      `Method '${method.name}' already exists in ${targetInterface}.`
    );
    return;
  }

  // Apply the edit
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(interfaceDocument.lineCount, 0)
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(interfaceUri, fullRange, updatedInterfaceCode);
  await vscode.workspace.applyEdit(edit);

  // Save the interface file
  await interfaceDocument.save();

  vscode.window.showInformationMessage(
    `Added '${method.name}' to ${targetInterface}.`
  );
}

function deactivate() {}

export { deactivate };
