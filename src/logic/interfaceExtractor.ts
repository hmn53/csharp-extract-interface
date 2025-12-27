/**
 * Interface extraction logic
 */
import * as path from "path";
import {
  extractNamespace,
  extractUsings,
  extractMethods,
  extractEvents,
} from "./csharpParser";

export interface ExtractionResult {
  interfaceName: string;
  interfaceCode: string;
  namespace: string | null;
}

/**
 * Generate interface code from a C# class
 */
export function generateInterfaceCode(
  classText: string,
  interfaceName: string,
  currentFileName: string
): ExtractionResult {
  const className = currentFileName.replace(".cs", "");
  const actualInterfaceName = path.basename(interfaceName);

  const namespace = extractNamespace(classText);
  const usings = extractUsings(classText);

  // Get methods excluding constructors
  const methods = extractMethods(classText, className);
  const interfaceMethods = methods.map((m) => {
    const generic = m.genericParams ? `<${m.genericParams}>` : "";
    return `    ${m.returnType} ${m.name}${generic}(${m.parameters});`;
  });

  // Get events
  const events = extractEvents(classText);
  const interfaceEvents = events.map((e) => `    event ${e.type} ${e.name};`);

  const allInterfaceMembers = [...interfaceMethods, ...interfaceEvents];

  // Generate the interface code, including the namespace if available
  const interfaceCode = namespace
    ? `${usings}\n\nnamespace ${namespace} \n{\n\tpublic interface ${actualInterfaceName} \n\t{\n\t${allInterfaceMembers.join(
        "\n\t"
      )}\n\t}\n}`
    : `${usings}\n\npublic interface ${actualInterfaceName} \n{\n${allInterfaceMembers.join(
        "\n"
      )}\n}`;

  return { interfaceName: actualInterfaceName, interfaceCode, namespace };
}

/**
 * Update a class declaration to implement an interface
 */
export function updateClassToImplementInterface(
  classText: string,
  className: string,
  interfaceName: string
): string {
  // Regex for primary constructors
  const primaryConstructorRegex = new RegExp(
    `(public\\s+class\\s+${className}\\(([^)]*)\\))(\\s*:\\s*([^\\s{]+(?:\\s*,\\s*[^\\s{]+)*))?`
  );

  let match = primaryConstructorRegex.exec(classText);
  if (match) {
    const classDeclarationPart = match[1];
    const existingInheritanceWithColon = match[3];

    if (existingInheritanceWithColon) {
      if (existingInheritanceWithColon.includes(interfaceName)) {
        return classText;
      }
      return classText.replace(
        primaryConstructorRegex,
        `${classDeclarationPart}${existingInheritanceWithColon}, ${interfaceName}`
      );
    } else {
      return classText.replace(
        primaryConstructorRegex,
        `${classDeclarationPart} : ${interfaceName}`
      );
    }
  }

  // Regex for regular classes
  const regularClassRegex = new RegExp(
    `(public\\s+class\\s+${className})(\\s*:\\s*([^\\s{]+(?:\\s*,\\s*[^\\s{]+)*))?`
  );

  match = regularClassRegex.exec(classText);
  if (match) {
    const classDeclarationPart = match[1];
    const existingInheritanceWithColon = match[2];

    if (existingInheritanceWithColon) {
      if (existingInheritanceWithColon.includes(interfaceName)) {
        return classText;
      }
      return classText.replace(
        regularClassRegex,
        `${classDeclarationPart}${existingInheritanceWithColon}, ${interfaceName}`
      );
    } else {
      return classText.replace(
        regularClassRegex,
        `${classDeclarationPart} : ${interfaceName}`
      );
    }
  }

  return classText;
}
