import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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
    const { interfaceName, interfaceCode, namespace } =
      await generateInterfaceWithNamespaceAndEditClass(text, fileName);

    // Construct the new interface file path
    const interfacePath = path.join(currentDirectory, `${interfaceName}.cs`);

    // Check if the file already exists
    if (fs.existsSync(interfacePath)) {
      vscode.window.showWarningMessage(
        `File "${interfaceName}.cs" already exists in the same folder. No file was created.`
      );
      return;
    }

    // Create the new file and write the interface code
    const uri = vscode.Uri.file(interfacePath);
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.createFile(uri, { ignoreIfExists: true });
    workspaceEdit.insert(uri, new vscode.Position(0, 0), interfaceCode);

    await vscode.workspace.applyEdit(workspaceEdit);

    // Modify the current file to implement the interface
    const updatedClassText = updateClassToImplementInterface(
      text,
      fileName,
      interfaceName
    );

    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount, 0)
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange, updatedClassText);
    await vscode.workspace.applyEdit(edit);

    // Show the interface file
    await vscode.window.showTextDocument(uri);

    vscode.window.showInformationMessage(
      `Interface ${interfaceName} created successfully and class updated to implement it.`
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
  interfaceName: string;
  interfaceCode: string;
  namespace: string | null;
}> {
  // Extract the class name and default interface name
  const className = currentFileName.replace(".cs", "");
  const defaultInterfaceName = `I${className}`;

  // Prompt for interface name
  const interfaceName = await vscode.window.showInputBox({
    prompt: "Enter the name for the interface",
    value: defaultInterfaceName,
  });

  if (!interfaceName) {
    throw new Error("Interface name not provided");
  }

  // Extract the namespace from the class file
  const namespaceMatch = classText.match(/namespace\s+([\w.]+)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : null;

  // Extract public methods for the interface
  const methodRegex =
    /public\s+(?!class|interface|struct|enum|delegate)\s*(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
  const matches = [...classText.matchAll(methodRegex)];

  const interfaceMethods = matches.map((match) => {
    const [, returnType, methodName, params] = match;
    return `    ${returnType} ${methodName}(${params});`;
  });

  // Generate the interface code, including the namespace if available
  const interfaceCode = namespace
    ? `namespace ${namespace} \n{\npublic interface ${interfaceName} \n{\n${interfaceMethods.join(
        "\n"
      )}\n}\n}`
    : `public interface ${interfaceName} \n{\n${interfaceMethods.join(
        "\n"
      )}\n}`;

  return { interfaceName, interfaceCode, namespace };
}

function updateClassToImplementInterface(
  classText: string,
  className: string,
  interfaceName: string
): string {
  // Check for primary constructor
  const primaryConstructorRegex = new RegExp(
    `public\\s+class\\s+${className}\\(([^)]*)\\)\\s*(:\\s*[^\\s{]*)?`
  );

  if (primaryConstructorRegex.test(classText)) {
    return classText.replace(
      primaryConstructorRegex,
      `public class ${className}($1) : ${interfaceName}`
    );
  }

  // Handle regular classes
  const classRegex = new RegExp(
    `public\\s+class\\s+${className}\\s*(:\\s*[^\\s{]*)?`
  );

  return classText.replace(
    classRegex,
    `public class ${className} : ${interfaceName}`
  );
}

function deactivate() {}

export { deactivate };
