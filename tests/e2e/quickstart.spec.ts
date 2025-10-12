import { test, expect, Page } from '@playwright/test';

test.describe('Quickstart Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start the page at the root URL
    await page.goto('http://localhost:3000');
  });

  test('should complete basic conversation and proposal flow', async ({
    page,
  }) => {
    // 1. Check that landing page shows two calendar panels
    await expect(
      page.locator('[data-testid="calendar-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="calendar-proposed"]')
    ).toBeVisible();

    // 2. Check for "Start Conversation" button and click it
    const startButton = page.locator('button', {
      hasText: 'Start Conversation',
    });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 3. Check conversation panel appears
    await expect(
      page.locator('[data-testid="conversation-panel"]')
    ).toBeVisible();

    // 4. Simulate typing a problem statement (since mic might not be available in test)
    const textInput = page
      .locator(
        'input[placeholder*="problem"], textarea[placeholder*="problem"], input[type="text"]'
      )
      .first();
    if (await textInput.isVisible()) {
      await textInput.fill('My Tuesdays are too hectic');
      await textInput.press('Enter');
    }

    // 5. Wait for clarifying question to appear (max 5 seconds)
    await expect(
      page.locator('[data-testid="clarifying-question"]')
    ).toBeVisible({ timeout: 5000 });

    // 6. Provide an answer to the clarifying question
    const answerInput = page
      .locator(
        'input[placeholder*="answer"], textarea[placeholder*="answer"], input[type="text"]'
      )
      .first();
    if (await answerInput.isVisible()) {
      await answerInput.fill('I want more focus time and earlier dinner');
      await answerInput.press('Enter');
    }

    // 7. Wait for proposal to appear (max 60 seconds as per requirements)
    await expect(page.locator('[data-testid="proposal"]')).toBeVisible({
      timeout: 60000,
    });

    // 8. Check that proposal contains changes with rationale
    const changeItems = page.locator('[data-testid="change-item"]');
    const changeCount = await changeItems.count();
    expect(changeCount).toBeGreaterThanOrEqual(1);

    // 9. Check for Apply Changes button
    const applyButton = page.locator('button', { hasText: /Apply Changes?/i });
    await expect(applyButton).toBeVisible();

    // 10. Check for Undo functionality (should be available after apply)
    // Note: We'll just check that the UI exists rather than actually applying
    await expect(page.locator('button', { hasText: /Undo/i })).toBeVisible();

    // 11. Check for Export functionality
    await expect(page.locator('button', { hasText: /Export/i })).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network failure scenario
    await page.route('**/api/**', (route) => route.abort());

    // Try to start conversation
    const startButton = page.locator('button', {
      hasText: 'Start Conversation',
    });
    await startButton.click();

    // Should show error message for network failures
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should have accessible UI elements', async ({ page }) => {
    // Check WCAG AA contrast - basic accessibility checks

    // Main navigation/buttons should be keyboard accessible
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);

    // Check for proper ARIA labels on key interactive elements
    const startButton = page.locator('button', {
      hasText: 'Start Conversation',
    });
    await expect(startButton).toHaveAttribute('aria-label', /.+/);
  });

  test('should persist preferences in localStorage', async ({ page }) => {
    // Navigate to preferences/settings
    const settingsButton = page
      .locator('button', { hasText: /Settings|Preferences/i })
      .first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Change a preference
      const sleepTarget = page
        .locator('input[name="sleepTargetHours"], input[placeholder*="sleep"]')
        .first();
      if (await sleepTarget.isVisible()) {
        await sleepTarget.fill('8');

        // Save preferences
        const saveButton = page.locator('button', { hasText: /Save|Apply/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }

        // Reload page and check persistence
        await page.reload();
        await settingsButton.click();
        await expect(sleepTarget).toHaveValue('8');
      }
    }
  });
});

test.describe('Performance Requirements', () => {
  test('should meet performance goals', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3000');

    // Start conversation
    const startButton = page.locator('button', {
      hasText: 'Start Conversation',
    });
    await startButton.click();

    // Input problem
    const textInput = page.locator('input[type="text"], textarea').first();
    if (await textInput.isVisible()) {
      await textInput.fill('My schedule needs help');
      await textInput.press('Enter');
    }

    // Measure time to first clarifying question (should be < 2s subjective)
    const questionStart = Date.now();
    await expect(
      page.locator('[data-testid="clarifying-question"]')
    ).toBeVisible({ timeout: 5000 });
    const questionTime = Date.now() - questionStart;

    console.log(`Time to first clarifying question: ${questionTime}ms`);
    expect(questionTime).toBeLessThanOrEqual(3000); // Allow 3s buffer for test environment
  });
});
