import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const extractInterfaceCommand = vscode.commands.registerCommand(
    "csharp.extractInterface",
    async () => {
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
        const { interfaceName, interfaceCode } =
          await generateInterfaceWithFileNamePrompt(text, fileName);

        // Construct the new interface file path
        const interfacePath = path.join(
          currentDirectory,
          `${interfaceName}.cs`
        );

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
        await vscode.window.showTextDocument(uri);

        vscode.window.showInformationMessage(
          `Interface ${interfaceName} created successfully in the same folder as the class.`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Failed to generate interface."
        );
      }
    }
  );
  context.subscriptions.push(extractInterfaceCommand);
}

async function generateInterfaceWithFileNamePrompt(
  classText: string,
  currentFileName: string
): Promise<{ interfaceName: string; interfaceCode: string }> {
  // Get the base file name without extension
  const className = currentFileName.replace(".cs", "");
  const defaultInterfaceName = `I${className}`;

  // Prompt the user for the interface name
  const interfaceName = await vscode.window.showInputBox({
    prompt: "Enter the name for the interface",
    value: defaultInterfaceName,
  });

  if (!interfaceName) {
    vscode.window.showErrorMessage("Interface name is required!");
    throw new Error("Interface name not provided");
  }

  // Regex to find public methods
  const methodRegex =
    /public\s+(?!class|interface|struct|enum|delegate)\s*(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
  const matches = [...classText.matchAll(methodRegex)];

  const interfaceMethods = matches.map((match) => {
    const [, returnType, methodName, params] = match;
    return `    ${returnType} ${methodName}(${params});`;
  });

  // Generate interface code
  const interfaceCode = `public interface ${interfaceName} {\n${interfaceMethods.join(
    "\n"
  )}\n}`;

  return { interfaceName, interfaceCode };
}

function deactivate() {}

export { deactivate };
