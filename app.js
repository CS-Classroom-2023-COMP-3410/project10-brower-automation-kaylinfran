const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

(async () => {
    // TODO: Launch a browser instance and open a new page
    const browser = await puppeteer.launch({
      headless: true, 
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] // necessary for some environments
    }); 
    const page = await browser.newPage();

    // Navigate to GitHub login page
    await page.goto('https://github.com/login');

    // TODO: Login to GitHub using the provided credentials
    // HINT: Use the 'type' method to input username and password, then click on the submit button
    await page.type('#login_field', credentials.username); // grab from credentials.json
    await page.type('#password', credentials.password);
    // await page.click('input[type="submit"]');

    await Promise.all([
      page.waitForNavigation(),
      page.click('input[type="submit"]')
    ]);

    await page.screenshot({ path: 'after-login.png' });

    // Wait for successful login
    await page.waitForSelector('meta[name="octolytics-actor-login"]');

    // Extract the actual GitHub username to be used later
    const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

    // getting rid of the banner that appears after login
    await page.evaluate(() => {
      document.querySelectorAll('[class*="flash"]').forEach(el => el.remove());
    });

    // list of repositories to star and add to list 
    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    // iterate through repositories and star them
    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`, { waitUntil: 'networkidle2' });

        // getting rid of the banner that appears after login
        await page.evaluate(() => {
          document.querySelectorAll('[class*="flash"]').forEach(el => el.remove());
        });

        await page.waitForSelector('#repository-container-header'); // wait for the repository page to load
        
        await page.evaluate(() => {
          document.querySelectorAll('[class*="flash"]').forEach(el => el.remove());
        })

        // const html = await page.evaluate(() => document.body.innerHTML);
        // require('fs').writeFileSync(`debug-${repo.replace('/', '-')}.html`, html);

        // TODO: Star the repository
        await page.waitForSelector('button[aria-label^="Star this repository"]', { visible: true , timeout: 10000 });

        // HINT: Use selectors to identify and click on the star button
        const starButton = await page.$('button[aria-label^="Star this repository"]');
        await starButton.evaluate(b => b.scrollIntoView());
        await starButton.click();

        await new Promise(resolve => setTimeout(resolve, 2000)); // This timeout helps ensure that the action is fully processed

        // checking to see if it was starred 
        await page.screenshot({ path: `starred-${repo.replace('/', '-')}.png` });
        
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

    await page.screenshot({ path: 'created-list.png' });

    const dropdownSelector = 'summary[aria-label="Add to list"]';

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`, { waitUntil: 'networkidle2' });

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
      await page.screenshot({ path: 'added-to-list.png' });
    // Close the browser
    await browser.close();
})();
