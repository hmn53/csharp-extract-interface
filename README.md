# **C# Essentials**

Essential refactoring tools and quality-of-life improvements for C# developers in VS Code.

## **Features**

### Extract Interface
- Extract interfaces from C# classes
- Automatically generate the interface in the same directory as the class
- Update the class to implement the newly created interface
- Option to provide a custom name and path for the interface

### Add Method to Interface
- Add a public method from a class to an interface it implements
- Automatically finds interface files in the workspace
- Supports multiple interfaces (prompts for selection)
- Prevents duplicate method signatures

### Add Property to Interface
- Add a public property from a class to an interface it implements
- Supports all property types including generics and nullable types
- Automatically finds interface files in the workspace
- Prevents duplicate property signatures

### Implement Interface
- Generate stub implementations for all interface members
- Automatically detects unimplemented methods, properties, and events
- Generates proper method stubs with `throw new NotImplementedException()`
- Supports multiple interfaces (select which one to implement)

## **Usage**

### **Extract Interface**

1. Open a C# file in VS Code.
2. Press `Ctrl + .` on a `class` keyword (place the cursor on it).
3. In the context menu, select **"Extract Interface"**.
4. Enter a name for the new interface (default is `I` followed by the class name).
5. The extension will:
   - Generate an interface with all public methods of the class.
   - Create the interface in the same directory as the class.
   - Modify the class to implement the new interface.

### **Example**

Given a class like this:

```csharp
public class DiceManager
{
    public void RollDice() { }
    public int GetScore() { return 0; }
}
```

After clicking on **"Extract Interface"**, it will generate the following interface:

```csharp
public interface IDiceManager
{
    void RollDice();
    int GetScore();
}
```

The `DiceManager` class will be updated to:

```csharp
public class DiceManager : IDiceManager
{
    public void RollDice() { }
    public int GetScore() { return 0; }
}
```

### **Add Method to Interface**

1. Open a C# file that implements an interface.
2. Press `Ctrl + .` on a public method.
3. Select **"Add 'MethodName' to Interface"**.
4. If the class implements multiple interfaces, select which one to add the method to.
5. The method signature will be added to the interface file.

### **Add Property to Interface**

1. Open a C# file that implements an interface.
2. Press `Ctrl + .` on a public property.
3. Select **"Add 'PropertyName' to Interface"**.
4. If the class implements multiple interfaces, select which one to add the property to.
5. The property signature will be added to the interface file.

### **Implement Interface**

1. Open a C# class that declares it implements an interface (e.g., `public class MyClass : IMyInterface`).
2. Press `Ctrl + .` on the class declaration.
3. Select **"Implement 'InterfaceName'"**.
4. If the class implements multiple interfaces, each will be shown as a separate option.
5. The extension will generate stubs for all unimplemented members.

### **Example**

Given an interface:

```csharp
public interface IDataService
{
    int Id { get; set; }
    event EventHandler DataChanged;
    Task<string> GetDataAsync(int id);
}
```

And a class that doesn't implement it yet:

```csharp
public class DataService : IDataService
{
}
```

After clicking on **"Implement 'IDataService'"**, the class will be updated to:

```csharp
public class DataService : IDataService
{
    public int Id { get; set; }

    public event EventHandler DataChanged;

    public Task<string> GetDataAsync(int id)
    {
        throw new NotImplementedException();
    }
}
```

---

## **Troubleshooting**

### **I don't see the "Extract Interface" option in the context menu.**

Make sure you're pressing `Ctrl + .` on the class declaration (`public class <ClassName>`) in the editor. If you are on a method or variable, the option won't appear.

If `Ctrl + .` doesn't work, try right-clicking on the class declaration and selecting "Extract Interface" from the context menu.

### **The generated interface is not updating the class.**

Ensure that the class is being correctly identified by the extension. If the class is not in the format `public class <ClassName>`, or if it's in a file that doesn't follow standard C# conventions, the extension may not function as expected.
