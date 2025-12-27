import * as assert from "assert";
import {
  addMethodToInterface,
  addPropertyToInterface,
  parseMethodFromLine,
  parsePropertyFromLine,
  findImplementedInterfaces,
  generateMethodSignature,
  generatePropertySignature,
} from "../logic/addToInterface";

suite("Add Method to Interface Tests", () => {
  suite("parseMethodFromLine", () => {
    test("Parses simple public method", () => {
      const line = "    public void DoSomething() {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.ok(result);
      assert.strictEqual(result.returnType, "void");
      assert.strictEqual(result.name, "DoSomething");
      assert.strictEqual(result.parameters, "");
    });

    test("Parses method with parameters", () => {
      const line = "    public string GetName(int id, bool flag) {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.ok(result);
      assert.strictEqual(result.returnType, "string");
      assert.strictEqual(result.name, "GetName");
      assert.strictEqual(result.parameters, "int id, bool flag");
    });

    test("Parses async method", () => {
      const line = "    public async Task<int> FetchDataAsync() {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.ok(result);
      assert.strictEqual(result.returnType, "Task<int>");
      assert.strictEqual(result.name, "FetchDataAsync");
    });

    test("Parses generic method", () => {
      const line = "    public T GetValue<T>(string key) {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.ok(result);
      assert.strictEqual(result.returnType, "T");
      assert.strictEqual(result.name, "GetValue");
      assert.strictEqual(result.genericParams, "T");
    });

    test("Returns null for constructor", () => {
      const line = "    public MyClass() {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.strictEqual(result, null);
    });

    test("Returns null for non-public method", () => {
      const line = "    private void DoSomething() {";
      const classText = "public class MyClass { }";
      const result = parseMethodFromLine(line, classText);

      assert.strictEqual(result, null);
    });
  });

  suite("findImplementedInterfaces", () => {
    test("Finds single interface", () => {
      const classCode = "public class MyClass : IMyInterface { }";
      const result = findImplementedInterfaces(classCode);

      assert.deepStrictEqual(result, ["IMyInterface"]);
    });

    test("Finds multiple interfaces", () => {
      const classCode = "public class MyClass : IFirst, ISecond, IThird { }";
      const result = findImplementedInterfaces(classCode);

      assert.deepStrictEqual(result, ["IFirst", "ISecond", "IThird"]);
    });

    test("Filters out base class", () => {
      const classCode = "public class MyClass : BaseClass, IMyInterface { }";
      const result = findImplementedInterfaces(classCode);

      assert.deepStrictEqual(result, ["IMyInterface"]);
    });

    test("Returns empty array for class without interfaces", () => {
      const classCode = "public class MyClass { }";
      const result = findImplementedInterfaces(classCode);

      assert.deepStrictEqual(result, []);
    });

    test("Works with primary constructor", () => {
      const classCode = "public class MyClass(int x) : IMyInterface { }";
      const result = findImplementedInterfaces(classCode);

      assert.deepStrictEqual(result, ["IMyInterface"]);
    });
  });

  suite("generateMethodSignature", () => {
    test("Generates simple method signature", () => {
      const method = {
        returnType: "void",
        name: "DoWork",
        genericParams: null,
        parameters: "",
      };
      const result = generateMethodSignature(method);

      assert.strictEqual(result, "void DoWork();");
    });

    test("Generates method with parameters", () => {
      const method = {
        returnType: "string",
        name: "GetName",
        genericParams: null,
        parameters: "int id",
      };
      const result = generateMethodSignature(method);

      assert.strictEqual(result, "string GetName(int id);");
    });

    test("Generates generic method signature", () => {
      const method = {
        returnType: "T",
        name: "GetValue",
        genericParams: "T",
        parameters: "string key",
      };
      const result = generateMethodSignature(method);

      assert.strictEqual(result, "T GetValue<T>(string key);");
    });
  });

  suite("addMethodToInterface", () => {
    test("Adds method to empty interface", () => {
      const interfaceCode = `public interface IMyInterface
{
}`;
      const method = {
        returnType: "void",
        name: "DoWork",
        genericParams: null,
        parameters: "",
      };
      const result = addMethodToInterface(interfaceCode, method);

      assert.ok(result.includes("void DoWork();"));
    });

    test("Adds method to interface with existing members", () => {
      const interfaceCode = `public interface IMyInterface
{
    string GetName();
}`;
      const method = {
        returnType: "void",
        name: "DoWork",
        genericParams: null,
        parameters: "",
      };
      const result = addMethodToInterface(interfaceCode, method);

      assert.ok(result.includes("string GetName();"));
      assert.ok(result.includes("void DoWork();"));
    });

    test("Does not add duplicate method", () => {
      const interfaceCode = `public interface IMyInterface
{
    void DoWork();
}`;
      const method = {
        returnType: "void",
        name: "DoWork",
        genericParams: null,
        parameters: "",
      };
      const result = addMethodToInterface(interfaceCode, method);

      // Should be unchanged
      assert.strictEqual(result, interfaceCode);
    });

    test("Adds method to namespaced interface", () => {
      const interfaceCode = `namespace MyNamespace
{
    public interface IMyInterface
    {
        string GetName();
    }
}`;
      const method = {
        returnType: "void",
        name: "DoWork",
        genericParams: null,
        parameters: "",
      };
      const result = addMethodToInterface(interfaceCode, method);

      assert.ok(result.includes("string GetName();"));
      assert.ok(result.includes("void DoWork();"));
    });
  });
});

suite("Add Property to Interface Tests", () => {
  suite("parsePropertyFromLine", () => {
    test("Parses simple property", () => {
      const line = "    public string Name { get; set; }";
      const result = parsePropertyFromLine(line);

      assert.ok(result);
      assert.strictEqual(result.type, "string");
      assert.strictEqual(result.name, "Name");
    });

    test("Parses readonly property", () => {
      const line = "    public int Count { get; }";
      const result = parsePropertyFromLine(line);

      assert.ok(result);
      assert.strictEqual(result.type, "int");
      assert.strictEqual(result.name, "Count");
    });

    test("Parses generic type property", () => {
      const line = "    public List<string> Items { get; set; }";
      const result = parsePropertyFromLine(line);

      assert.ok(result);
      assert.strictEqual(result.type, "List<string>");
      assert.strictEqual(result.name, "Items");
    });

    test("Parses nullable property", () => {
      const line = "    public string? OptionalName { get; set; }";
      const result = parsePropertyFromLine(line);

      assert.ok(result);
      assert.strictEqual(result.type, "string?");
      assert.strictEqual(result.name, "OptionalName");
    });

    test("Returns null for non-property line", () => {
      const line = "    private string _name;";
      const result = parsePropertyFromLine(line);

      assert.strictEqual(result, null);
    });

    test("Returns null for method", () => {
      const line = "    public void DoSomething() {";
      const result = parsePropertyFromLine(line);

      assert.strictEqual(result, null);
    });
  });

  suite("generatePropertySignature", () => {
    test("Generates property signature", () => {
      const property = {
        type: "string",
        name: "Name",
      };
      const result = generatePropertySignature(property);

      assert.strictEqual(result, "string Name { get; set; }");
    });

    test("Generates generic type property signature", () => {
      const property = {
        type: "List<int>",
        name: "Numbers",
      };
      const result = generatePropertySignature(property);

      assert.strictEqual(result, "List<int> Numbers { get; set; }");
    });
  });

  suite("addPropertyToInterface", () => {
    test("Adds property to empty interface", () => {
      const interfaceCode = `public interface IMyInterface
{
}`;
      const property = {
        type: "string",
        name: "Name",
      };
      const result = addPropertyToInterface(interfaceCode, property);

      assert.ok(result.includes("string Name { get; set; }"));
    });

    test("Adds property to interface with existing members", () => {
      const interfaceCode = `public interface IMyInterface
{
    void DoWork();
}`;
      const property = {
        type: "int",
        name: "Count",
      };
      const result = addPropertyToInterface(interfaceCode, property);

      assert.ok(result.includes("void DoWork();"));
      assert.ok(result.includes("int Count { get; set; }"));
    });

    test("Does not add duplicate property", () => {
      const interfaceCode = `public interface IMyInterface
{
    string Name { get; set; }
}`;
      const property = {
        type: "string",
        name: "Name",
      };
      const result = addPropertyToInterface(interfaceCode, property);

      // Should be unchanged
      assert.strictEqual(result, interfaceCode);
    });
  });
});
