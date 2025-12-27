import * as assert from "assert";
import {
  addMethodToInterface,
  parseMethodFromLine,
  findImplementedInterfaces,
  generateMethodSignature,
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
