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
    const interfacePath = path.join(targetDirectory, `${actualInterfaceName}.cs`);

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
    workspaceEdit.insert(interfaceUri, new vscode.Position(0, 0), interfaceCode);

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
    prompt: "Enter the interface name (e.g., IMyService or ../Interfaces/IMyService)",
    value: defaultInterfaceName,
  });

  if (!interfaceNameFromPrompt) {
    // Return undefined for interfaceNameFromPrompt if user cancels
    return { interfaceNameFromPrompt: undefined, interfaceCode: "", namespace: null };
  }

  const actualInterfaceName = path.basename(interfaceNameFromPrompt);

  // Extract the namespace from the class file
  const namespaceMatch = classText.match(/namespace\s+([\w.]+)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : null;

  // Match methods but exclude constructors and class declarations
  const methodRegex =
    /public\s+(?:async\s+)?([\w<>\[\]]+)\s+(\w+)\s*(?:<([^>]*)>)?\s*\(([^)]*)\)\s*(?={)/g;

  const matches = [...classText.matchAll(methodRegex)];

  const interfaceMethods = matches
    .filter((match) => match[2] !== className) // Exclude constructors
    .map((match) => {
      const [, returnType, methodName, genericParams, params] = match;
      const generic = genericParams ? `<${genericParams}>` : "";
      return `    ${returnType} ${methodName}${generic}(${params});`;
    });

  // Generate the interface code, including the namespace if available
  const interfaceCode = namespace
    ? `namespace ${namespace} \n{\n\tpublic interface ${actualInterfaceName} \n\t{\n\t${interfaceMethods.join(
        "\n\t"
      )}\n\t}\n}`
    : `public interface ${actualInterfaceName} \n{\n${interfaceMethods.join(
        "\n"
      )}\n}`;

  return { interfaceNameFromPrompt, interfaceCode, namespace };
}

function updateClassToImplementInterface(
  classText: string,
  className: string,
  interfaceName: string
): string {
  // Regex for primary constructors
  // Group 1: `public class ClassName(...)` (the class declaration itself including params)
  // Group 2: Primary constructor parameters (inside the parentheses)
  // Group 3: The existing inheritance part including colon (e.g., ` : BaseClass, IExisting`)
  // Group 4: The actual list of inherited classes/interfaces (e.g., `BaseClass, IExisting`)
  const primaryConstructorRegex = new RegExp(
    `(public\\s+class\\s+${className}\\(([^)]*)\\))(\\s*:\\s*([^\\s{]+(?:\\s*,\\s*[^\\s{]+)*))?`
  );

  let match = primaryConstructorRegex.exec(classText);
  if (match) {
    const classDeclarationPart = match[1]; // e.g., public class MyClass(string name)
    // const params = match[2]; // Parameters, not directly needed for replacement string construction here
    const existingInheritanceWithColon = match[3]; // e.g., ` : BaseClass, IExisting` or undefined
    // const existingInheritanceList = match[4]; // e.g., `BaseClass, IExisting` or undefined

    if (existingInheritanceWithColon) {
      // Append to existing inheritance: preserves original spacing around colon, adds ", interfaceName"
      return classText.replace(primaryConstructorRegex, `${classDeclarationPart}${existingInheritanceWithColon}, ${interfaceName}`);
    } else {
      // Add new inheritance: " : interfaceName"
      return classText.replace(primaryConstructorRegex, `${classDeclarationPart} : ${interfaceName}`);
    }
  }

  // Regex for regular classes (no primary constructor parameters)
  // Group 1: `public class ClassName` (the class keyword and name)
  // Group 2: The existing inheritance part including colon (e.g., ` : BaseClass, IExisting`)
  // Group 3: The actual list of inherited classes/interfaces (e.g., `BaseClass, IExisting`)
  const regularClassRegex = new RegExp(
    `(public\\s+class\\s+${className})(\\s*:\\s*([^\\s{]+(?:\\s*,\\s*[^\\s{]+)*))?`
  );

  match = regularClassRegex.exec(classText);
  if (match) {
    const classDeclarationPart = match[1]; // e.g., public class MyClass
    const existingInheritanceWithColon = match[2]; // e.g., ` : BaseClass, IExisting` or undefined
    // const existingInheritanceList = match[3]; // e.g., `BaseClass, IExisting` or undefined

    if (existingInheritanceWithColon) {
      // Append to existing inheritance: preserves original spacing around colon, adds ", interfaceName"
      return classText.replace(regularClassRegex, `${classDeclarationPart}${existingInheritanceWithColon}, ${interfaceName}`);
    } else {
      // Add new inheritance: " : interfaceName"
      return classText.replace(regularClassRegex, `${classDeclarationPart} : ${interfaceName}`);
    }
  }

  // Fallback: if no class pattern matches (should ideally not happen if called correctly)
  // or if the class structure is unusual and not caught by the regexes.
  // To prevent data loss, it's safer to return original text or throw an error.
  // For this specific case, returning original text and relying on user to notice.
  vscode.window.showWarningMessage(`Could not update class ${className} to implement ${interfaceName}. Please check the class structure.`);
  return classText;
}

function deactivate() {}

export { deactivate };
