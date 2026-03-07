const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

(async () => {
    // TODO: Launch a browser instance and open a new page
    const browser = await puppeteer.launch({ headless: false}); // see browser actions
    const page = await browser.newPage();

    // Navigate to GitHub login page
    await page.goto('https://github.com/login');

    // TODO: Login to GitHub using the provided credentials
    // HINT: Use the 'type' method to input username and password, then click on the submit button
    await page.type('#login_field', credentials.username); // grab from credentials.json
    await page.type('#password', credentials.password);
    await page.click('input[type="submit"]');

    // Wait for successful login
    await page.waitForSelector('.avatar.circle');

    // Extract the actual GitHub username to be used later
    const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

    // list of repositories to star and add to list 
    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    // iterate through repositories and star them
    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Star the repository
        await page.waitForSelector('button[aria-label*="Star"]');
        // HINT: Use selectors to identify and click on the star button
        await page.click('button[aria-label*="Star"]'); // click the star button
        await page.waitForTimeout(2000); // This timeout helps ensure that the action is fully processed
    }

    // TODO: Navigate to the user's starred repositories page
    await page.goto(`https://github.com/${actualUsername}?tab=stars`);

    // TODO: Click on the "Create list" button
    await page.waitForSelector('button[data-testid="create-list-button"]');
    await page.click('button[data-testid="create-list-button"]');

    // TODO: Create a list named "Node Libraries"
    // HINT: Wait for the input field and type the list name
    await page.waitForSelector('input[name="name"]');
    await page.type('input[name="name"]', 'Node Libraries');

    // Wait for buttons to become visible
    await page.waitForTimeout(1000);

    // Identify and click the "Create" button
    const buttons = await page.$$('.Button--primary.Button--medium.Button');
    for (const button of buttons) {
        const buttonText = await button.evaluate(node => node.textContent.trim());
        if (buttonText === 'Create') {
            await button.click();
            break;
        }
    }

    // Allow some time for the list creation process
    await page.waitForTimeout(2000);

    const dropdownSelector = 'summary[aria-label="Add to list"]';

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Add this repository to the "Node Libraries" list
        // HINT: Open the dropdown, wait for it to load, and find the list by its name
        await page.waitForSelector(dropdownSelector);
        await page.click(dropdownSelector);
        await page.waitForTimeout(1000);
        const lists = await page.$$('.js-user-list-menu-form');

        for (const list of lists) {
          const textHandle = await list.getProperty('innerText');
          const text = await textHandle.jsonValue();
          if (text.includes('Node Libraries')) {
            await list.click();
            break;
          }
        }

        // Allow some time for the action to process
        await page.waitForTimeout(1000);

        // Close the dropdown to finalize the addition to the list
        await page.click(dropdownSelector);
      }

    // Close the browser
    await browser.close();
})();
