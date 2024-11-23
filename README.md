# **C# Extract Interface**

This extension allows C# developers to quickly extract interfaces from C# classes. It provides a context menu option to generate an interface containing all the public method signatures of a class. The interface is created in the same directory as the class file, and the class definition is updated to implement the newly generated interface.

## **Features**

- Extract interfaces from C# classes.
- Automatically generate the interface in the same directory as the class.
- Update the class to implement the newly created interface.
- Option to provide a custom name for the interface.

## **Installation**

1. Open **VS Code**.
2. Go to the **Extensions** view (`Ctrl+Shift+X`).
3. Search for **"C# Extract Interface"**.
4. Click **Install**.

## **Usage**

### **Context Menu Option**

1. Open a C# file in VS Code.
2. Right-click on a `class` keyword (or place the cursor on it).
3. In the context menu, select **"Extract Interface"** from the **Refactor** or **Quick Fix** options.
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

After running the **"Extract Interface"** command, the extension will generate the following interface:

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

---

## **Troubleshooting**

### **I don't see the "Extract Interface" option in the context menu.**

Make sure you're right-clicking on the class declaration (`public class <ClassName>`) in the editor. If you are on a method or variable, the option won't appear.

### **The generated interface is not updating the class.**

Ensure that the class is being correctly identified by the extension. If the class is not in the format `public class <ClassName>`, or if it's in a file that doesn't follow standard C# conventions, the extension may not function as expected.
