/**
 * Logic for implementing interface stubs in a class
 */

import { MethodInfo, PropertyInfo, EventInfo } from "./csharpParser";

/**
 * Represents all members of an interface
 */
export interface InterfaceMembers {
  methods: MethodInfo[];
  properties: PropertyInfo[];
  events: EventInfo[];
}

/**
 * Parse an interface file and extract all its members
 */
export function parseInterfaceMembers(interfaceCode: string): InterfaceMembers {
  const methods: MethodInfo[] = [];
  const properties: PropertyInfo[] = [];
  const events: EventInfo[] = [];

  // Find the interface body - use balanced brace matching
  const interfaceStartMatch = interfaceCode.match(/interface\s+\w+(?:<[^>]*>)?\s*\{/);

  if (!interfaceStartMatch) {
    return { methods, properties, events };
  }

  // Find the matching closing brace
  const startIndex = interfaceStartMatch.index! + interfaceStartMatch[0].length;
  let braceCount = 1;
  let endIndex = startIndex;

  for (let i = startIndex; i < interfaceCode.length && braceCount > 0; i++) {
    if (interfaceCode[i] === '{') {
      braceCount++;
    } else if (interfaceCode[i] === '}') {
      braceCount--;
    }
    if (braceCount === 0) {
      endIndex = i;
    }
  }

  const interfaceBody = interfaceCode.substring(startIndex, endIndex);

  // Parse methods: returnType MethodName(params);
  // Must have parentheses but NOT have { get (which would be a property)
  const methodRegex = /([\w<>\[\]?]+)\s+(\w+)\s*(?:<([^>]*)>)?\s*\(([^)]*)\)\s*;/g;
  let match;
  while ((match = methodRegex.exec(interfaceBody)) !== null) {
    methods.push({
      returnType: match[1],
      name: match[2],
      genericParams: match[3] || null,
      parameters: match[4],
    });
  }

  // Parse properties: Type Name { get; set; } or { get; }
  // Need to handle whitespace including newlines in interface body
  const propertyRegex = /([\w<>\[\]?,]+)\s+(\w+)\s*\{\s*get\s*;\s*(?:set\s*;)?\s*\}/g;
  while ((match = propertyRegex.exec(interfaceBody)) !== null) {
    properties.push({
      type: match[1].trim(),
      name: match[2],
    });
  }

  // Parse events: event EventType EventName;
  const eventRegex = /event\s+([\w<>\[\].]+)\s+(\w+)\s*;/g;
  while ((match = eventRegex.exec(interfaceBody)) !== null) {
    events.push({
      type: match[1],
      name: match[2],
    });
  }

  return { methods, properties, events };
}

/**
 * Generate a method stub implementation
 */
export function generateMethodStub(method: MethodInfo, indent: string = "    "): string {
  const generic = method.genericParams ? `<${method.genericParams}>` : "";
  const signature = `public ${method.returnType} ${method.name}${generic}(${method.parameters})`;

  // Generate appropriate return statement based on return type
  let body: string;
  if (method.returnType === "void") {
    body = `throw new NotImplementedException();`;
  } else if (method.returnType === "Task") {
    body = `throw new NotImplementedException();`;
  } else if (method.returnType.startsWith("Task<")) {
    body = `throw new NotImplementedException();`;
  } else if (method.returnType === "bool") {
    body = `throw new NotImplementedException();`;
  } else if (method.returnType === "int" || method.returnType === "long" ||
             method.returnType === "float" || method.returnType === "double" ||
             method.returnType === "decimal") {
    body = `throw new NotImplementedException();`;
  } else if (method.returnType === "string") {
    body = `throw new NotImplementedException();`;
  } else {
    body = `throw new NotImplementedException();`;
  }

  return `${indent}${signature}\n${indent}{\n${indent}    ${body}\n${indent}}`;
}

/**
 * Generate a property stub implementation
 */
export function generatePropertyStub(property: PropertyInfo, indent: string = "    "): string {
  return `${indent}public ${property.type} ${property.name} { get; set; }`;
}

/**
 * Generate an event stub implementation
 */
export function generateEventStub(event: EventInfo, indent: string = "    "): string {
  return `${indent}public event ${event.type} ${event.name};`;
}

/**
 * Generate all interface implementation stubs
 */
export function generateInterfaceStubs(
  members: InterfaceMembers,
  indent: string = "    "
): string {
  const stubs: string[] = [];

  // Generate property stubs first (common convention)
  for (const property of members.properties) {
    stubs.push(generatePropertyStub(property, indent));
  }

  // Generate event stubs
  for (const event of members.events) {
    stubs.push(generateEventStub(event, indent));
  }

  // Generate method stubs
  for (const method of members.methods) {
    stubs.push(generateMethodStub(method, indent));
  }

  return stubs.join("\n\n");
}

/**
 * Find the position to insert interface implementation stubs in a class
 * Returns the line content just before the closing brace of the class
 */
export function findClassInsertPosition(classCode: string): number {
  const lines = classCode.split("\n");

  // Find the last closing brace that's likely the class closing brace
  // We look for a line that is just "}" or "    }" etc.
  let braceCount = 0;
  let classStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if class declaration starts
    if (/class\s+\w+/.test(line)) {
      classStarted = true;
    }

    if (classStarted) {
      // Count braces
      for (const char of line) {
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            // This is the closing brace of the class
            return i;
          }
        }
      }
    }
  }

  return -1;
}

/**
 * Insert interface stubs into a class
 */
export function insertInterfaceStubs(
  classCode: string,
  stubs: string
): string {
  const insertPosition = findClassInsertPosition(classCode);

  if (insertPosition === -1) {
    return classCode; // Could not find insertion point
  }

  const lines = classCode.split("\n");

  // Insert stubs before the closing brace
  const before = lines.slice(0, insertPosition);
  const after = lines.slice(insertPosition);

  // Add blank line before stubs if there's content
  const needsBlankLine = before.length > 0 &&
    before[before.length - 1].trim() !== "" &&
    before[before.length - 1].trim() !== "{";

  const stubLines = needsBlankLine ? "\n" + stubs + "\n" : stubs + "\n";

  return [...before, stubLines, ...after].join("\n");
}

/**
 * Check which interface members are already implemented in a class
 */
export function filterUnimplementedMembers(
  members: InterfaceMembers,
  classCode: string
): InterfaceMembers {
  const unimplementedMethods = members.methods.filter(method => {
    // Check if method name exists in class with public modifier
    const methodPattern = new RegExp(`public\\s+.*\\b${method.name}\\s*[<(]`);
    return !methodPattern.test(classCode);
  });

  const unimplementedProperties = members.properties.filter(property => {
    // Check if property name exists in class
    const propertyPattern = new RegExp(`public\\s+.*\\b${property.name}\\s*{`);
    return !propertyPattern.test(classCode);
  });

  const unimplementedEvents = members.events.filter(event => {
    // Check if event exists in class
    const eventPattern = new RegExp(`public\\s+event\\s+.*\\b${event.name}\\b`);
    return !eventPattern.test(classCode);
  });

  return {
    methods: unimplementedMethods,
    properties: unimplementedProperties,
    events: unimplementedEvents,
  };
}
