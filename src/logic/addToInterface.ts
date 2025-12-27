/**
 * Logic for adding members to existing interfaces
 */

import { MethodInfo, PropertyInfo } from "./csharpParser";

/**
 * Generate a method signature for an interface
 */
export function generateMethodSignature(method: MethodInfo): string {
  const generic = method.genericParams ? `<${method.genericParams}>` : "";
  return `${method.returnType} ${method.name}${generic}(${method.parameters});`;
}

/**
 * Generate a property signature for an interface
 */
export function generatePropertySignature(property: PropertyInfo): string {
  return `${property.type} ${property.name} { get; set; }`;
}

/**
 * Add a method signature to an interface
 * Returns the updated interface code
 */
export function addMethodToInterface(
  interfaceCode: string,
  method: MethodInfo
): string {
  const signature = generateMethodSignature(method);
  return addMemberToInterface(interfaceCode, signature);
}

/**
 * Add a property signature to an interface
 * Returns the updated interface code
 */
export function addPropertyToInterface(
  interfaceCode: string,
  property: PropertyInfo
): string {
  const signature = generatePropertySignature(property);
  return addMemberToInterface(interfaceCode, signature);
}

/**
 * Add a member (method or property signature) to an interface
 * Handles both namespaced and non-namespaced interfaces
 */
function addMemberToInterface(
  interfaceCode: string,
  memberSignature: string
): string {
  // Check if the member already exists in the interface
  // Extract just the member name for comparison
  const memberNameMatch = memberSignature.match(/(\w+)\s*[<(]/);
  if (memberNameMatch) {
    const memberName = memberNameMatch[1];
    // Check if this method/property name already exists
    const existingPattern = new RegExp(`\\b${memberName}\\s*[<(]`);
    if (existingPattern.test(interfaceCode)) {
      // Member already exists, return unchanged
      return interfaceCode;
    }
  }

  // Find the closing brace of the interface
  // Handle both tabbed (namespaced) and non-tabbed formats

  // Try to find the interface body pattern
  const interfaceMatch = interfaceCode.match(
    /(interface\s+\w+\s*(?:<[^>]*>)?\s*\{)([\s\S]*?)(\})/
  );

  if (!interfaceMatch) {
    // Could not find interface pattern, return unchanged
    return interfaceCode;
  }

  const interfaceStart = interfaceMatch[1];
  const interfaceBody = interfaceMatch[2];
  const interfaceEnd = interfaceMatch[3];

  // Determine indentation from existing members or use default
  const existingMemberMatch = interfaceBody.match(/^(\s+)\S/m);
  const indent = existingMemberMatch ? existingMemberMatch[1] : "    ";

  // Check if body has content (excluding whitespace)
  const hasContent = interfaceBody.trim().length > 0;

  let newBody: string;
  if (hasContent) {
    // Add new member after existing content
    // Remove trailing whitespace from body, add new member, then closing
    const trimmedBody = interfaceBody.trimEnd();
    newBody = `${trimmedBody}\n${indent}${memberSignature}\n`;
  } else {
    // Empty interface, add first member
    newBody = `\n${indent}${memberSignature}\n`;
  }

  // Reconstruct the interface
  const beforeInterface = interfaceCode.substring(
    0,
    interfaceCode.indexOf(interfaceMatch[0])
  );
  const afterInterface = interfaceCode.substring(
    interfaceCode.indexOf(interfaceMatch[0]) + interfaceMatch[0].length
  );

  // Determine closing brace indentation
  const closingIndentMatch = interfaceCode.match(/^(\s*)\}[\s\S]*$/m);
  const closingIndent = closingIndentMatch ? "" : "";

  return `${beforeInterface}${interfaceStart}${newBody}${closingIndent}${interfaceEnd}${afterInterface}`;
}

/**
 * Parse a method from a line of C# code
 * Returns null if the line doesn't contain a valid public method
 */
export function parseMethodFromLine(line: string, fullText: string): MethodInfo | null {
  // Match public methods (including async)
  const methodRegex =
    /public\s+(?:async\s+)?([\w<>\[\]]+)\s+(\w+)\s*(?:<([^>]*)>)?\s*\(([^)]*)\)/;

  const match = line.match(methodRegex);
  if (!match) {
    return null;
  }

  const [, returnType, name, genericParams, parameters] = match;

  // Check if this is a constructor (method name matches class name)
  const classMatch = fullText.match(/class\s+(\w+)/);
  if (classMatch && classMatch[1] === name) {
    return null; // This is a constructor, not a method
  }

  return {
    returnType,
    name,
    genericParams: genericParams || null,
    parameters,
  };
}

/**
 * Find all interfaces implemented by a class in the given code
 */
export function findImplementedInterfaces(classCode: string): string[] {
  // Match class declaration with inheritance
  // Handles: public class Foo : IBar, IBaz
  // Handles: public class Foo(params) : Base, IBar
  const classMatch = classCode.match(
    /class\s+\w+(?:\s*\([^)]*\))?\s*:\s*([^{]+)/
  );

  if (!classMatch) {
    return [];
  }

  const inheritanceList = classMatch[1];

  // Split by comma and filter for interfaces (starting with 'I' followed by uppercase)
  return inheritanceList
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^I[A-Z]/.test(s));
}

/**
 * Parse a property from a line of C# code
 * Returns null if the line doesn't contain a valid public property
 */
export function parsePropertyFromLine(line: string): PropertyInfo | null {
  // Match public properties with get accessor
  // Handles: public string Name { get; set; }
  // Handles: public int Count { get; }
  // Handles: public List<string> Items { get; set; }
  const propertyRegex =
    /public\s+([\w<>\[\]?]+)\s+(\w+)\s*{\s*get/;

  const match = line.match(propertyRegex);
  if (!match) {
    return null;
  }

  const [, type, name] = match;

  return {
    type,
    name,
  };
}
