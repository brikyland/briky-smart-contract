import fs from "fs"

function printInterfaceIds() {
    const filePath = "tests/land/EstateForger.test.ts";
    const outputPath = "tests/land/EstateForger.test.renumbered.ts";
    const testNumber = 4;
    
    const file = fs.readFileSync(filePath, "utf8");
    const functionPattern = new RegExp(`/describe(\.only)?\('${testNumber}\.([0-9]+)\./g`, 'i');
    let match;
    let functionIndex = 1;
    let newContent = file;
    
    while ((match = functionPattern.exec(file)) !== null) {
        const fullMatch = match[0];
        const replacement = `describe${match[1] || ''}('4.${functionIndex}.`;
        newContent = newContent.replace(fullMatch, replacement);

        const testcasePattern = new RegExp(`/it(\.only)?\('${testNumber}\.([0-9]+)\./g`, 'i');
        let testcaseIndex = 1;
        while ((match = testcasePattern.exec(file)) !== null) {
            const fullMatch = match[0];
            const replacement = `it${match[1] || ''}('${testNumber}.${functionIndex}.${testcaseIndex}.`;
            newContent = newContent.replace(fullMatch, replacement);
            testcaseIndex++;
        }

        functionIndex++;
    }
    
    fs.writeFileSync(outputPath, newContent, "utf8");
}

printInterfaceIds(); 