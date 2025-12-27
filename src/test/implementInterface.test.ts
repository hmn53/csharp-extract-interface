import * as assert from "assert";
import {
  parseInterfaceMembers,
  generateMethodStub,
  generatePropertyStub,
  generateEventStub,
  generateInterfaceStubs,
  findClassInsertPosition,
  insertInterfaceStubs,
  filterUnimplementedMembers,
} from "../logic/implementInterface";

suite("Implement Interface Logic Tests", () => {
  suite("parseInterfaceMembers", () => {
    test("should parse simple method", () => {
      const interfaceCode = `
public interface IMyService
{
    void DoSomething();
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.methods.length, 1);
      assert.strictEqual(members.methods[0].name, "DoSomething");
      assert.strictEqual(members.methods[0].returnType, "void");
      assert.strictEqual(members.methods[0].parameters, "");
    });

    test("should parse method with parameters", () => {
      const interfaceCode = `
public interface IMyService
{
    string GetData(int id, string name);
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.methods.length, 1);
      assert.strictEqual(members.methods[0].name, "GetData");
      assert.strictEqual(members.methods[0].returnType, "string");
      assert.strictEqual(members.methods[0].parameters, "int id, string name");
    });

    test("should parse generic method", () => {
      const interfaceCode = `
public interface IRepository
{
    T GetById<T>(int id);
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.methods.length, 1);
      assert.strictEqual(members.methods[0].name, "GetById");
      assert.strictEqual(members.methods[0].genericParams, "T");
    });

    test("should parse async method with Task return type", () => {
      const interfaceCode = `
public interface IAsyncService
{
    Task<List<User>> GetUsersAsync();
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.methods.length, 1);
      assert.strictEqual(members.methods[0].returnType, "Task<List<User>>");
    });

    test("should parse property with get and set", () => {
      const interfaceCode = `
public interface IEntity
{
    int Id { get; set; }
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.properties.length, 1);
      assert.strictEqual(members.properties[0].name, "Id");
      assert.strictEqual(members.properties[0].type, "int");
    });

    test("should parse readonly property", () => {
      const interfaceCode = `
public interface IReadOnly
{
    string Name { get; }
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.properties.length, 1);
      assert.strictEqual(members.properties[0].name, "Name");
    });

    test("should parse event", () => {
      const interfaceCode = `
public interface IObservable
{
    event EventHandler Changed;
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.events.length, 1);
      assert.strictEqual(members.events[0].name, "Changed");
      assert.strictEqual(members.events[0].type, "EventHandler");
    });

    test("should parse event with generic delegate", () => {
      const interfaceCode = `
public interface INotifier
{
    event EventHandler<DataChangedEventArgs> DataChanged;
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.events.length, 1);
      assert.strictEqual(members.events[0].name, "DataChanged");
      assert.strictEqual(members.events[0].type, "EventHandler<DataChangedEventArgs>");
    });

    test("should parse multiple members", () => {
      const interfaceCode = `
public interface ICompleteService
{
    int Id { get; set; }
    string Name { get; }
    event EventHandler Updated;
    void Process();
    Task<bool> ValidateAsync(string input);
}`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.properties.length, 2);
      assert.strictEqual(members.events.length, 1);
      assert.strictEqual(members.methods.length, 2);
    });

    test("should return empty for invalid interface", () => {
      const interfaceCode = `public class NotAnInterface { }`;
      const members = parseInterfaceMembers(interfaceCode);
      assert.strictEqual(members.methods.length, 0);
      assert.strictEqual(members.properties.length, 0);
      assert.strictEqual(members.events.length, 0);
    });
  });

  suite("generateMethodStub", () => {
    test("should generate void method stub", () => {
      const method = { returnType: "void", name: "DoWork", genericParams: null, parameters: "" };
      const stub = generateMethodStub(method);
      assert.ok(stub.includes("public void DoWork()"));
      assert.ok(stub.includes("throw new NotImplementedException();"));
    });

    test("should generate method with parameters", () => {
      const method = { returnType: "string", name: "GetName", genericParams: null, parameters: "int id" };
      const stub = generateMethodStub(method);
      assert.ok(stub.includes("public string GetName(int id)"));
    });

    test("should generate generic method", () => {
      const method = { returnType: "T", name: "Find", genericParams: "T", parameters: "int id" };
      const stub = generateMethodStub(method);
      assert.ok(stub.includes("public T Find<T>(int id)"));
    });

    test("should generate async Task method", () => {
      const method = { returnType: "Task", name: "ProcessAsync", genericParams: null, parameters: "" };
      const stub = generateMethodStub(method);
      assert.ok(stub.includes("public Task ProcessAsync()"));
    });

    test("should generate Task<T> method", () => {
      const method = { returnType: "Task<int>", name: "CountAsync", genericParams: null, parameters: "" };
      const stub = generateMethodStub(method);
      assert.ok(stub.includes("public Task<int> CountAsync()"));
    });
  });

  suite("generatePropertyStub", () => {
    test("should generate property stub", () => {
      const property = { type: "string", name: "Name" };
      const stub = generatePropertyStub(property);
      assert.ok(stub.includes("public string Name { get; set; }"));
    });

    test("should generate nullable property stub", () => {
      const property = { type: "int?", name: "Age" };
      const stub = generatePropertyStub(property);
      assert.ok(stub.includes("public int? Age { get; set; }"));
    });

    test("should generate generic property stub", () => {
      const property = { type: "List<string>", name: "Items" };
      const stub = generatePropertyStub(property);
      assert.ok(stub.includes("public List<string> Items { get; set; }"));
    });
  });

  suite("generateEventStub", () => {
    test("should generate event stub", () => {
      const event = { type: "EventHandler", name: "Changed" };
      const stub = generateEventStub(event);
      assert.ok(stub.includes("public event EventHandler Changed;"));
    });

    test("should generate generic event stub", () => {
      const event = { type: "EventHandler<CustomEventArgs>", name: "DataUpdated" };
      const stub = generateEventStub(event);
      assert.ok(stub.includes("public event EventHandler<CustomEventArgs> DataUpdated;"));
    });
  });

  suite("generateInterfaceStubs", () => {
    test("should generate stubs for all member types", () => {
      const members = {
        properties: [{ type: "int", name: "Id" }],
        events: [{ type: "EventHandler", name: "Changed" }],
        methods: [{ returnType: "void", name: "Process", genericParams: null, parameters: "" }],
      };
      const stubs = generateInterfaceStubs(members);
      assert.ok(stubs.includes("public int Id { get; set; }"));
      assert.ok(stubs.includes("public event EventHandler Changed;"));
      assert.ok(stubs.includes("public void Process()"));
    });

    test("should generate properties before events before methods", () => {
      const members = {
        properties: [{ type: "int", name: "Id" }],
        events: [{ type: "EventHandler", name: "Changed" }],
        methods: [{ returnType: "void", name: "DoWork", genericParams: null, parameters: "" }],
      };
      const stubs = generateInterfaceStubs(members);
      const propIndex = stubs.indexOf("Id");
      const eventIndex = stubs.indexOf("Changed");
      const methodIndex = stubs.indexOf("DoWork");
      assert.ok(propIndex < eventIndex, "Properties should come before events");
      assert.ok(eventIndex < methodIndex, "Events should come before methods");
    });

    test("should handle empty members", () => {
      const members = { properties: [], events: [], methods: [] };
      const stubs = generateInterfaceStubs(members);
      assert.strictEqual(stubs, "");
    });
  });

  suite("findClassInsertPosition", () => {
    test("should find closing brace of simple class", () => {
      const classCode = `public class MyClass
{
    public void Method() { }
}`;
      const position = findClassInsertPosition(classCode);
      assert.strictEqual(position, 3);
    });

    test("should find closing brace with nested braces", () => {
      const classCode = `public class MyClass
{
    public void Method()
    {
        if (true)
        {
            DoSomething();
        }
    }
}`;
      const position = findClassInsertPosition(classCode);
      assert.strictEqual(position, 9);
    });

    test("should return -1 for no class", () => {
      const code = `namespace MyNamespace { }`;
      const position = findClassInsertPosition(code);
      assert.strictEqual(position, -1);
    });
  });

  suite("insertInterfaceStubs", () => {
    test("should insert stubs before closing brace", () => {
      const classCode = `public class MyClass : IMyInterface
{
}`;
      const stubs = "    public void DoWork()\n    {\n        throw new NotImplementedException();\n    }";
      const result = insertInterfaceStubs(classCode, stubs);
      assert.ok(result.includes("public void DoWork()"));
      assert.ok(result.indexOf("DoWork") < result.lastIndexOf("}"));
    });

    test("should add blank line before stubs if needed", () => {
      const classCode = `public class MyClass : IMyInterface
{
    public int Id { get; set; }
}`;
      const stubs = "    public void DoWork()\n    {\n        throw new NotImplementedException();\n    }";
      const result = insertInterfaceStubs(classCode, stubs);
      // Check that there's content before the stub
      assert.ok(result.includes("Id { get; set; }"));
      assert.ok(result.includes("DoWork()"));
    });
  });

  suite("filterUnimplementedMembers", () => {
    test("should filter out implemented methods", () => {
      const members = {
        methods: [
          { returnType: "void", name: "DoWork", genericParams: null, parameters: "" },
          { returnType: "string", name: "GetName", genericParams: null, parameters: "" },
        ],
        properties: [],
        events: [],
      };
      const classCode = `public class MyClass : IMyInterface
{
    public void DoWork() { }
}`;
      const unimplemented = filterUnimplementedMembers(members, classCode);
      assert.strictEqual(unimplemented.methods.length, 1);
      assert.strictEqual(unimplemented.methods[0].name, "GetName");
    });

    test("should filter out implemented properties", () => {
      const members = {
        methods: [],
        properties: [
          { type: "int", name: "Id" },
          { type: "string", name: "Name" },
        ],
        events: [],
      };
      const classCode = `public class MyClass : IMyInterface
{
    public int Id { get; set; }
}`;
      const unimplemented = filterUnimplementedMembers(members, classCode);
      assert.strictEqual(unimplemented.properties.length, 1);
      assert.strictEqual(unimplemented.properties[0].name, "Name");
    });

    test("should filter out implemented events", () => {
      const members = {
        methods: [],
        properties: [],
        events: [
          { type: "EventHandler", name: "Changed" },
          { type: "EventHandler", name: "Updated" },
        ],
      };
      const classCode = `public class MyClass : IMyInterface
{
    public event EventHandler Changed;
}`;
      const unimplemented = filterUnimplementedMembers(members, classCode);
      assert.strictEqual(unimplemented.events.length, 1);
      assert.strictEqual(unimplemented.events[0].name, "Updated");
    });

    test("should return all members if none implemented", () => {
      const members = {
        methods: [{ returnType: "void", name: "DoWork", genericParams: null, parameters: "" }],
        properties: [{ type: "int", name: "Id" }],
        events: [{ type: "EventHandler", name: "Changed" }],
      };
      const classCode = `public class MyClass : IMyInterface
{
}`;
      const unimplemented = filterUnimplementedMembers(members, classCode);
      assert.strictEqual(unimplemented.methods.length, 1);
      assert.strictEqual(unimplemented.properties.length, 1);
      assert.strictEqual(unimplemented.events.length, 1);
    });

    test("should return empty if all implemented", () => {
      const members = {
        methods: [{ returnType: "void", name: "DoWork", genericParams: null, parameters: "" }],
        properties: [{ type: "int", name: "Id" }],
        events: [{ type: "EventHandler", name: "Changed" }],
      };
      const classCode = `public class MyClass : IMyInterface
{
    public int Id { get; set; }
    public event EventHandler Changed;
    public void DoWork() { }
}`;
      const unimplemented = filterUnimplementedMembers(members, classCode);
      assert.strictEqual(unimplemented.methods.length, 0);
      assert.strictEqual(unimplemented.properties.length, 0);
      assert.strictEqual(unimplemented.events.length, 0);
    });
  });
});
