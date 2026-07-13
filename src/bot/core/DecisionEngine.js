'use strict';

class DecisionEngine {
  constructor(logger) {
    this.logger = logger;
    this.personalizedRemaining = null; // null = unknown
    this.weeklyLimitReached = false;
    this.restrictionDetected = false;
    this.consecutiveErrors = 0;
    this.successCount = 0;
    this.errorCount = 0;
  }

  recordOutcome(success) {
    if (success) {
      this.successCount++;
      this.consecutiveErrors = 0;
    } else {
      this.errorCount++;
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= 3) {
        this.logger.warn(
          `🧠 ${this.consecutiveErrors} consecutive errors — slowing down to protect the account`
        );
      }
    }
  }

  currentCooldownMs() {
    if (this.consecutiveErrors <= 0) return 0;
    const base = 2000;
    return Math.min(base * Math.pow(2, this.consecutiveErrors - 1), 20000);
  }

  successRate() {
    const total = this.successCount + this.errorCount;
    return total === 0 ? null : this.successCount / total;
  }

  shouldAddNote(userRequested) {
    if (!userRequested) {
      this.logger.info('🧠 Decision: user disabled notes → sending without note');
      return false;
    }
    if (this.personalizedRemaining !== null && this.personalizedRemaining <= 0) {
      this.logger.warn(
        `🧠 Decision: personalized quota exhausted (${this.personalizedRemaining}) → fallback to "without note"`
      );
      return false;
    }
    const msg = this.personalizedRemaining === null
      ? 'quota unknown'
      : `${this.personalizedRemaining} remaining`;
    this.logger.info(`🧠 Decision: sending with note (${msg})`);
    return true;
  }

  optimizeText(text, maxLength = 200) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    this.logger.warn(
      `🧠 Decision: text too long (${text.length} > ${maxLength}) → truncating`
    );
    return text.substring(0, maxLength - 1).trimEnd() + '…';
  }

  updatePersonalizedCount(count) {
    if (typeof count !== 'number' || isNaN(count)) return;
    const prev = this.personalizedRemaining;
    this.personalizedRemaining = count;
    if (prev !== count) {
      this.logger.info(`🧠 Personalized quota: ${count} remaining`);
    }
  }

  consumePersonalizedInvitation() {
    if (this.personalizedRemaining !== null && this.personalizedRemaining > 0) {
      this.personalizedRemaining -= 1;
      this.logger.info(`🧠 Quota consumed: ${this.personalizedRemaining} remaining`);
    }
  }

  assess() {
    const rate = this.successRate();
    const parts = [];
    if (rate !== null) parts.push(`recent success ${(rate * 100).toFixed(0)}%`);
    if (this.personalizedRemaining !== null) parts.push(`quota ${this.personalizedRemaining}`);
    if (this.weeklyLimitReached) parts.push('weekly limit hit previously');
    return parts.length ? parts.join(', ') : 'fresh session, no history';
  }

  markWeeklyLimitReached() {
    if (!this.weeklyLimitReached) {
      this.weeklyLimitReached = true;
      this.logger.error('🧠 ⚠️ Weekly limit reached — stopping');
    }
  }

  markRestrictionDetected(keyword) {
    if (!this.restrictionDetected) {
      this.restrictionDetected = true;
      this.logger.error(`🧠 ⚠️ Restriction detected: "${keyword}" — stopping`);
    }
  }

  shouldStopDueToLimits() {
    return this.weeklyLimitReached || this.restrictionDetected;
  }
}

module.exports = { DecisionEngine };
