const puppeteer = require('puppeteer');
const fs = require('fs');
const { create } = require('domain');

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
        });

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
  
    await page.evaluate(() => {
          document.querySelectorAll('[class*="flash"]').forEach(el => el.remove());
        });

    // TODO: Navigate to the user's starred repositories page
    await page.goto(`https://github.com/${actualUsername}?tab=stars`, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
          document.querySelectorAll('[class*="flash"]').forEach(el => el.remove());
        });

    // wait for the stars page to fully load
    await page.waitForSelector('body');

    // find the "Create list" button by text
    const buttons = await page.$$('button, a, summary');

    let createButton = null;

    for (const button of buttons) {
      const text = await button.evaluate(el => el.innerText);
      if (text && text.includes('Create list')) {
        createButton = button;
        break;
      }
    }

    // click button
    if (createButton) {
      await createButton.evaluate(el => el.scrollIntoView());
      await createButton.click();
    } else {
      console.log("Create list button not found");
      await page.screenshot({ path: 'create-button-not-found.png' });
    }

    // wait for the modal input
    await page.waitForSelector('#user_list_name', { visible: true });

    // type list name
    await page.type('#user_list_name', 'Node Libraries');

    // click create
    await page.waitForSelector('button[type="submit"]', { visible: true });
    await page.click('button[type="submit"]');

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'created-list.png' });

    const dropdownSelector = 'summary[aria-label="Add to list"]';

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`, { waitUntil: 'networkidle2' });

        // TODO: Add this repository to the "Node Libraries" list
        // HINT: Open the dropdown, wait for it to load, and find the list by its name
        await page.waitForSelector(dropdownSelector, { visible: true });
        
        const dropdown = await page.$(dropdownSelector);
        await dropdown.evaluate(element => element.scrollIntoView({ block: 'center'}));
        await dropdown.click();

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const lists = await page.$$('.js-user-list-menu-form');

        for (const list of lists) {
          const text = await list.evaluate('innerText');

          // const text = await textHandle.jsonValue();
          if (text.includes('Node Libraries')) {
              await list.evaluate(element => element.scrollIntoView({ block: 'center' }));
              await list.click();
              break;
          }
        }
        await page.screenshot({ path: `put_in_list_name.png` });
        // waiting
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        // close the dropdown if it's still open
        await dropdown.click();
      }
      await page.screenshot({ path: 'added-to-list.png' });
    // close the browser 
    await browser.close();
})();
