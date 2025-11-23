import * as path from "path";

export interface ExtractionResult {
  interfaceName: string;
  interfaceCode: string;
  namespace: string | null;
}

export function generateInterfaceCode(
  classText: string,
  interfaceName: string,
  currentFileName: string
): ExtractionResult {
  const className = currentFileName.replace(".cs", "");
  const actualInterfaceName = path.basename(interfaceName);

  // Extract the namespace from the class file
  const namespaceMatch = classText.match(/namespace\s+([\w.]+)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : null;

  // Extract usings
  const usingsMatch = classText.match(/^using\s+.*;/gm);
  const usings = usingsMatch ? usingsMatch.join("\n") : "";

  // Match methods but exclude constructors and class declarations
  const methodRegex =
    /public\s+(?:async\s+)?([\w<>\[\]]+)\s+(\w+)\s*(?:<([^>]*)>)?\s*\(([^)]*)\)\s*(?={)/g;

  const matches = [...classText.matchAll(methodRegex)];

  const interfaceMethods = matches
    .filter((match) => match[2] !== className) // Exclude constructors
    .map((match) => {
      const [, returnType, methodName, genericParams, params] = match;
      const generic = genericParams ? `<${genericParams}>` : "";
      return `    ${returnType} ${methodName}${generic}(${params});`;
    });

  // Match events
  const eventRegex = /public\s+event\s+([\w<>\[\]\.]+)\s+(\w+)\s*;/g;
  const eventMatches = [...classText.matchAll(eventRegex)];

  const interfaceEvents = eventMatches.map((match) => {
    const [, eventType, eventName] = match;
    return `    event ${eventType} ${eventName};`;
  });

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
