import { replaceFromIndex } from "@utils/utils";
import fs from "fs"
import { globSync } from "glob";

function renumberTest(filePath: string, outputPath: string) {
    let file = fs.readFileSync(filePath, "utf8");

    const testNumberPattern = new RegExp(`describe(\\.only)?\\(["']([0-9]+.[0-9a-z]+)\\.`, 'g');
    const testNumberMatch = testNumberPattern.exec(file);
    if (!testNumberMatch) {
        throw new Error("Test number not found");
    }
    const testNumber = testNumberMatch[2];

    const functionPattern = new RegExp(`describe(\\.only)?\\((["'])${testNumber}\\.([0-9]+)\\.`, 'g');
    let functionMatch;
    let functionIndex = 1;
    
    while ((functionMatch = functionPattern.exec(file)) !== null) {
        const fullMatch = functionMatch[0];
        const replacement = `describe${functionMatch[1] || ''}(${functionMatch[2]}${testNumber}.${functionIndex}.`;
        file = replaceFromIndex(file, functionMatch.index, fullMatch, replacement);

        const testcasePattern = new RegExp(`it(\\.only)?\\((["'])${testNumber}\\.[0-9]+\\.([0-9]+)\\.`, 'g');
        let testcaseMatch;
        let testcaseIndex = 1;

        let fileToReplace = file.slice(functionMatch.index);

        while ((testcaseMatch = testcasePattern.exec(fileToReplace)) !== null) {
            const fullMatch = testcaseMatch[0];
            const replacement = `it${testcaseMatch[1] || ''}(${testcaseMatch[2]}${testNumber}.${functionIndex}.${testcaseIndex}.`;
            fileToReplace = replaceFromIndex(fileToReplace, testcaseMatch.index, fullMatch, replacement);
            testcaseIndex++;
            if (testcaseIndex > 100) break;
        }

        file = file.slice(0, functionMatch.index) + fileToReplace;

        functionIndex++;
        if (functionIndex > 100) break;
    }
    
    fs.writeFileSync(outputPath, file, "utf8");
}

function renumberTests() {
    const testFiles = globSync("tests/**/*.test.ts");

    for (const file of testFiles) {
        renumberTest(file, file);
    }
}

renumberTests(); 