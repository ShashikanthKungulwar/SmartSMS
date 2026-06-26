export default class RuleEngine {
  // Takes one SMS + user's rules → returns matching action or null
  static match(smsBody, rules) {
    // Sort by priority descending (already sorted from DB but enforce here)
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
      if (!rule.isActive) continue;
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(smsBody)) {
          return { action: rule.action, ttl: rule.ttl, ruleId: rule._id, type: rule.type };
        }
      } catch {
        // Invalid regex in rule — skip it
        continue;
      }
    }
    return null; // No rule matched
  }
}