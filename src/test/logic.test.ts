import * as assert from "assert";
import {
  generateInterfaceCode,
  updateClassToImplementInterface,
} from "../logic";

suite("Logic Tests", () => {
  test("Extract Interface - Normal Class with Methods", () => {
    const classText = `
using System;

namespace MyNamespace
{
    public class MyClass
    {
        public void Method1() { }
        public int Method2(string s) { return 0; }
    }
}
`;
    const result = generateInterfaceCode(classText, "IMyClass", "MyClass.cs");

    assert.strictEqual(result.interfaceName, "IMyClass");
    assert.strictEqual(result.namespace, "MyNamespace");
    assert.ok(result.interfaceCode.includes("void Method1();"));
    assert.ok(result.interfaceCode.includes("int Method2(string s);"));
    assert.ok(result.interfaceCode.includes("using System;"));
  });

  test("Extract Interface - Async Methods", () => {
    const classText = `
    public class MyClass
    {
        public async Task<int> AsyncMethod() { return 0; }
    }
`;
    const result = generateInterfaceCode(classText, "IMyClass", "MyClass.cs");
    assert.ok(result.interfaceCode.includes("Task<int> AsyncMethod();"));
  });

  test("Extract Interface - Events", () => {
    const classText = `
    public class MyClass
    {
        public event EventHandler MyEvent;
    }
`;
    const result = generateInterfaceCode(classText, "IMyClass", "MyClass.cs");
    assert.ok(result.interfaceCode.includes("event EventHandler MyEvent;"));
  });

  test("Extract Interface - Ignore Properties", () => {
    const classText = `
    public class MyClass
    {
        public string MyProp { get; set; }
    }
`;
    const result = generateInterfaceCode(classText, "IMyClass", "MyClass.cs");
    assert.ok(!result.interfaceCode.includes("MyProp"));
  });

  test("Update Class - Normal Class", () => {
    const classText = "public class MyClass { }";
    const updated = updateClassToImplementInterface(
      classText,
      "MyClass",
      "IMyClass"
    );
    assert.strictEqual(updated, "public class MyClass : IMyClass { }");
  });

  test("Update Class - Primary Constructor", () => {
    const classText = "public class MyClass(int x) { }";
    const updated = updateClassToImplementInterface(
      classText,
      "MyClass",
      "IMyClass"
    );
    assert.strictEqual(updated, "public class MyClass(int x) : IMyClass { }");
  });

  test("Update Class - Existing Inheritance", () => {
    const classText = "public class MyClass : BaseClass { }";
    const updated = updateClassToImplementInterface(
      classText,
      "MyClass",
      "IMyClass"
    );
    assert.strictEqual(
      updated,
      "public class MyClass : BaseClass, IMyClass { }"
    );
  });

  test("Update Class - Primary Constructor with Inheritance", () => {
    const classText = "public class MyClass(int x) : BaseClass { }";
    const updated = updateClassToImplementInterface(
      classText,
      "MyClass",
      "IMyClass"
    );
    assert.strictEqual(
      updated,
      "public class MyClass(int x) : BaseClass, IMyClass { }"
    );
  });

  test("Update Class - Prevent Duplicates", () => {
    const classText = "public class MyClass : IMyClass { }";
    const updated = updateClassToImplementInterface(
      classText,
      "MyClass",
      "IMyClass"
    );
    assert.strictEqual(updated, "public class MyClass : IMyClass { }");
  });
});
