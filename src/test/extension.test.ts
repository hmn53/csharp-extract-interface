/* eslint-env mocha */
import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as path from "path";
import * as fs from "fs";
import { EOL } from "os"; // For consistent newlines

// Helper function to ensure consistent newlines (LF) for comparisons
const normalizeNewlines = (text: string) => text.replace(/\r\n/g, "\n");

suite("C# Extract Interface Extension Tests", () => {
  const testWorkspaceRoot = path.join(__dirname, "test_workspace");
  let showInputBoxStub: sinon.SinonStub;

  // Setup: Create a temporary workspace directory before all tests
  suiteSetup(async () => {
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testWorkspaceRoot, { recursive: true });
  });

  // Teardown: Remove the temporary workspace directory after all tests
  suiteTeardown(async () => {
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
  });

  // Before each test, ensure stubs are clean
  setup(() => {
    // It's important to restore any stubs to avoid interference between tests
    sinon.restore();
  });


  // After each test, restore stubs and close all editors
  teardown(async () => {
    sinon.restore();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    // Individual test cleanup (like deleting specific files) can be done within tests if needed,
    // but suiteTeardown handles the main workspace.
  });

  async function createTempFile(
    fileName: string,
    content: string,
    subDir: string = ""
  ): Promise<vscode.Uri> {
    const dirPath = path.join(testWorkspaceRoot, subDir);
    if (subDir && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, content);
    return vscode.Uri.file(filePath);
  }

  async function readFileContent(uri: vscode.Uri): Promise<string> {
    const document = await vscode.workspace.openTextDocument(uri);
    return normalizeNewlines(document.getText());
  }

  async function readFileContentDirectly(filePath: string): Promise<string> {
    return normalizeNewlines(fs.readFileSync(filePath, "utf-8"));
  }


  async function runExtractInterfaceCommand(
    inputFileUri: vscode.Uri,
    mockedInterfaceName: string
  ) {
    showInputBoxStub = sinon
      .stub(vscode.window, "showInputBox")
      .resolves(mockedInterfaceName);

    const document = await vscode.workspace.openTextDocument(inputFileUri);
    await vscode.window.showTextDocument(document);

    // Find the class definition to place the cursor.
    // For simplicity, assuming class is on the first line or easily findable.
    const text = document.getText();
    const classKeywordIndex = text.indexOf("class ");
    if (classKeywordIndex === -1) throw new Error("Class keyword not found in test file");
    
    const position = document.positionAt(classKeywordIndex);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(position, position);

    await vscode.commands.executeCommand("csharp.extractInterface");
  }

  // --- Test Cases for Primary Constructor Fix ---
  suite("Primary Constructor Tests", () => {
    test("Primary Constructor - No existing inheritance", async () => {
      const className = "MyClassNoInheritance";
      const interfaceName = `I${className}`;
      const fileContent = `public class ${className}(string p)${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(`${className}.cs`, fileContent);

      await runExtractInterfaceCommand(tempFileUri, interfaceName);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className}(string p) : ${interfaceName}${EOL}{${EOL}}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

      const interfaceFileUri = vscode.Uri.file(path.join(testWorkspaceRoot, `${interfaceName}.cs`));
      assert.ok(fs.existsSync(interfaceFileUri.fsPath), "Interface file not created");
      const interfaceContent = await readFileContent(interfaceFileUri);
      const expectedInterfaceContent = `public interface ${interfaceName} ${EOL}{${EOL}}`; // Assuming no methods for simplicity
      assert.strictEqual(interfaceContent, normalizeNewlines(expectedInterfaceContent), "Interface content incorrect");
    });

    test("Primary Constructor - Existing base class", async () => {
      const className = "MyClassWithBase";
      const interfaceName = `I${className}`;
      const baseClass = "BaseClass";
      const fileContent = `public class ${className}(string p) : ${baseClass}${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(`${className}.cs`, fileContent);

      await runExtractInterfaceCommand(tempFileUri, interfaceName);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className}(string p) : ${baseClass}, ${interfaceName}${EOL}{${EOL}}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");
    });

    test("Primary Constructor - Multiple existing interfaces/base class", async () => {
      const className = "MyClassWithMultiple";
      const interfaceName = `I${className}`;
      const baseClass = "BaseClass";
      const otherInterface = "IOther1";
      const fileContent = `public class ${className}(string p) : ${baseClass}, ${otherInterface}${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(`${className}.cs`, fileContent);

      await runExtractInterfaceCommand(tempFileUri, interfaceName);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className}(string p) : ${baseClass}, ${otherInterface}, ${interfaceName}${EOL}{${EOL}}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");
    });
  });

  // --- Test Cases for File Path Enhancement ---
  suite("File Path Enhancement Tests", () => {
    test("File Path - Just interface name (no path)", async () => {
      const className = "MySimpleClass";
      const interfaceName = `I${className}`;
      const fileContent = `public class ${className}${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(`${className}.cs`, fileContent, "src");

      await runExtractInterfaceCommand(tempFileUri, interfaceName);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className} : ${interfaceName}${EOL}{${EOL}}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

      const interfaceFileUri = vscode.Uri.file(path.join(testWorkspaceRoot, "src", `${interfaceName}.cs`));
      assert.ok(fs.existsSync(interfaceFileUri.fsPath), "Interface file not created in same directory");
    });

    test("File Path - Relative path (../Interfaces/IMyInterface)", async () => {
      const className = "MyClassForRelativePath";
      const actualInterfaceName = `I${className}`;
      const userInputPath = `../Interfaces/${actualInterfaceName}`; // Input to showInputBox

      const classDir = "src/Services";
      const classFileName = `${className}.cs`;
      const fileContent = `public class ${className}${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(classFileName, fileContent, classDir);
      
      // Expected interface directory relative to tempFileUri's directory
      const expectedInterfaceDir = path.resolve(path.dirname(tempFileUri.fsPath), "../Interfaces");
      const expectedInterfacePath = path.join(expectedInterfaceDir, `${actualInterfaceName}.cs`);

      await runExtractInterfaceCommand(tempFileUri, userInputPath);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className} : ${actualInterfaceName}${EOL}{${EOL}}`; // Class implements only the name part
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

      assert.ok(fs.existsSync(expectedInterfacePath), `Interface file not created at ${expectedInterfacePath}`);
      const interfaceContent = await readFileContentDirectly(expectedInterfacePath);
      const expectedInterfaceContent = `public interface ${actualInterfaceName} ${EOL}{${EOL}}`;
      assert.strictEqual(interfaceContent, normalizeNewlines(expectedInterfaceContent), "Interface content incorrect");
    });

    test("File Path - Relative path (SubDir/IMyInterface)", async () => {
      const className = "MyClassForSubDir";
      const actualInterfaceName = `I${className}`;
      const userInputPath = `SubInterfaces/${actualInterfaceName}`;

      const classDir = "src/Services";
      const classFileName = `${className}.cs`;
      const fileContent = `public class ${className}${EOL}{${EOL}}`;
      const tempFileUri = await createTempFile(classFileName, fileContent, classDir);

      const expectedInterfaceDir = path.resolve(path.dirname(tempFileUri.fsPath), "SubInterfaces");
      const expectedInterfacePath = path.join(expectedInterfaceDir, `${actualInterfaceName}.cs`);

      await runExtractInterfaceCommand(tempFileUri, userInputPath);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = `public class ${className} : ${actualInterfaceName}${EOL}{${EOL}}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

      assert.ok(fs.existsSync(expectedInterfacePath), `Interface file not created at ${expectedInterfacePath}`);
      const interfaceContent = await readFileContentDirectly(expectedInterfacePath);
      const expectedInterfaceContent = `public interface ${actualInterfaceName} ${EOL}{${EOL}}`;
      assert.strictEqual(interfaceContent, normalizeNewlines(expectedInterfaceContent), "Interface content incorrect");
    });
  });

  // --- Test Cases for Regular Classes (for completeness, good to have) ---
  suite("Regular Class Tests", () => {
    test("Regular Class - No existing inheritance", async () => {
        const className = "MyRegularClass";
        const interfaceName = `I${className}`;
        const fileContent = `public class ${className}${EOL}{${EOL}}`;
        const tempFileUri = await createTempFile(`${className}.cs`, fileContent);

        await runExtractInterfaceCommand(tempFileUri, interfaceName);

        const updatedClassContent = await readFileContent(tempFileUri);
        const expectedClassContent = `public class ${className} : ${interfaceName}${EOL}{${EOL}}`;
        assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

        const interfaceFileUri = vscode.Uri.file(path.join(testWorkspaceRoot, `${interfaceName}.cs`));
        assert.ok(fs.existsSync(interfaceFileUri.fsPath), "Interface file not created");
    });

    test("Regular Class - Existing base class", async () => {
        const className = "MyRegularClassWithBase";
        const interfaceName = `I${className}`;
        const baseClass = "AnotherBase";
        const fileContent = `public class ${className} : ${baseClass}${EOL}{${EOL}}`;
        const tempFileUri = await createTempFile(`${className}.cs`, fileContent);

        await runExtractInterfaceCommand(tempFileUri, interfaceName);

        const updatedClassContent = await readFileContent(tempFileUri);
        const expectedClassContent = `public class ${className} : ${baseClass}, ${interfaceName}${EOL}{${EOL}}`;
        assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");
    });
  });

  // --- Test for methods and namespace (more complex scenario) ---
  suite("Complex Scenario Tests", () => {
    test("Class with methods, namespace, and path", async () => {
      const className = "MyService";
      const actualInterfaceName = `I${className}`;
      const namespace = "MyCompany.Services";
      const userInputPath = `../Interfaces/${actualInterfaceName}`;

      const classDir = "src/AppServices";
      const classFileName = `${className}.cs`;
      const fileContent =
`namespace ${namespace}
{
    public class ${className}
    {
        public string GetName(int id)
        {
            return "Test";
        }

        public void DoWork()
        {
            // Does work
        }
    }
}`;
      const tempFileUri = await createTempFile(classFileName, fileContent, classDir);
      
      const expectedInterfaceDir = path.resolve(path.dirname(tempFileUri.fsPath), "../Interfaces");
      const expectedInterfacePath = path.join(expectedInterfaceDir, `${actualInterfaceName}.cs`);

      await runExtractInterfaceCommand(tempFileUri, userInputPath);

      const updatedClassContent = await readFileContent(tempFileUri);
      const expectedClassContent = 
`namespace ${namespace}
{
    public class ${className} : ${actualInterfaceName}
    {
        public string GetName(int id)
        {
            return "Test";
        }

        public void DoWork()
        {
            // Does work
        }
    }
}`;
      assert.strictEqual(updatedClassContent, normalizeNewlines(expectedClassContent), "Class content incorrect");

      assert.ok(fs.existsSync(expectedInterfacePath), `Interface file not created at ${expectedInterfacePath}`);
      const interfaceContent = await readFileContentDirectly(expectedInterfacePath);
      const expectedInterfaceContent = 
`namespace ${namespace} 
{
\tpublic interface ${actualInterfaceName} 
\t{
\t    string GetName(int id);
\t    void DoWork();
\t}
}`;
      assert.strictEqual(interfaceContent, normalizeNewlines(expectedInterfaceContent), "Interface content incorrect");
    });
  });
});
