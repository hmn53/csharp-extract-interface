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

---

## **Troubleshooting**

### **I don't see the "Extract Interface" option in the context menu.**

Make sure you're pressing `Ctrl + .` on the class declaration (`public class <ClassName>`) in the editor. If you are on a method or variable, the option won't appear.

If `Ctrl + .` doesn't work, try right-clicking on the class declaration and selecting "Extract Interface" from the context menu.

### **The generated interface is not updating the class.**

Ensure that the class is being correctly identified by the extension. If the class is not in the format `public class <ClassName>`, or if it's in a file that doesn't follow standard C# conventions, the extension may not function as expected.
