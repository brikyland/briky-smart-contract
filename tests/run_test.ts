import { execSync } from "child_process";

async function runTests() {
    const COMMON_PATH = "tests/common";
    const LAND_PATH = "tests/land";
    const LEND_PATH = "tests/lend";
    const LUCRA_PATH = "tests/lucra";

    const tests = [
        // `${COMMON_PATH}/common.test.ts`,
        // `${COMMON_PATH}/admin.test.ts`,
        // `${COMMON_PATH}/feeReceiver.test.ts`,
        // `${LAND_PATH}/estateToken.test.ts`,
        // `${LAND_PATH}/estateForger.test.ts`,
        `${LAND_PATH}/estateMarketplace.test.ts`,
        `${LAND_PATH}/commissionToken.test.ts`,
        `${LAND_PATH}/commissionMarketplace.test.ts`,
        `${LAND_PATH}/primaryToken.test.ts`,
        `${LAND_PATH}/treasury.test.ts`,
        `${LAND_PATH}/stakeToken.test.ts`,
        `${LAND_PATH}/distributor.test.ts`,
        `${LAND_PATH}/driptributor.test.ts`,
        `${LAND_PATH}/auction.test.ts`,
        `${LEND_PATH}/mortgageToken.test.ts`,
        `${LEND_PATH}/mortgageMarketplace.test.ts`,
        `${LUCRA_PATH}/passportToken.test.ts`,
        `${LUCRA_PATH}/promotionToken.test.ts`,
    ]

    for (const file of tests) {
        try {
            execSync(`npx hardhat test ${file}`, { stdio: "inherit" });
        } catch (error) {
            console.error(`Test failed: ${file}`);
            process.exit(1);
        }
    }      
}

runTests()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
