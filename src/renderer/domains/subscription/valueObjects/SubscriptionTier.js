/**
 * SubscriptionTier Value Object
 * Following Instructions standards with DDD principles
 */
export var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["BASIC"] = "basic";
    SubscriptionTier["PROFESSIONAL"] = "professional";
    SubscriptionTier["ENTERPRISE"] = "enterprise";
    SubscriptionTier["TRIAL"] = "trial";
})(SubscriptionTier || (SubscriptionTier = {}));
export class SubscriptionTierValue {
    tier;
    static TIER_FEATURES = {
        [SubscriptionTier.TRIAL]: {
            maxUsers: 2,
            maxAgencies: 1,
            maxDevices: 1,
            features: ['basic_dashboard', 'basic_reporting'],
            gracePeriodDays: 0,
            priority: 0,
        },
        [SubscriptionTier.BASIC]: {
            maxUsers: 5,
            maxAgencies: 1,
            maxDevices: 3,
            features: [
                'basic_dashboard',
                'basic_reporting',
                'inventory_management',
                'order_management',
                'customer_management',
            ],
            gracePeriodDays: 7,
            priority: 1,
        },
        [SubscriptionTier.PROFESSIONAL]: {
            maxUsers: 25,
            maxAgencies: 3,
            maxDevices: 10,
            features: [
                'basic_dashboard',
                'basic_reporting',
                'inventory_management',
                'order_management',
                'customer_management',
                'advanced_analytics',
                'employee_management',
                'multi_agency',
                'payment_tracking',
                'credit_management',
            ],
            gracePeriodDays: 14,
            priority: 2,
        },
        [SubscriptionTier.ENTERPRISE]: {
            maxUsers: -1, // Unlimited
            maxAgencies: -1, // Unlimited
            maxDevices: -1, // Unlimited
            features: [
                'basic_dashboard',
                'basic_reporting',
                'inventory_management',
                'order_management',
                'customer_management',
                'advanced_analytics',
                'employee_management',
                'multi_agency',
                'payment_tracking',
                'credit_management',
                'custom_integrations',
                'api_access',
                'priority_support',
                'data_export',
                'white_labeling',
            ],
            gracePeriodDays: 30,
            priority: 3,
        },
    };
    constructor(tier) {
        this.tier = tier;
    }
    static create(tier) {
        if (!Object.values(SubscriptionTier).includes(tier)) {
            throw new Error(`Invalid subscription tier: ${tier}`);
        }
        return new SubscriptionTierValue(tier);
    }
    static fromString(tier) {
        const normalizedTier = tier.toLowerCase();
        return SubscriptionTierValue.create(normalizedTier);
    }
    get value() {
        return this.tier;
    }
    get features() {
        return SubscriptionTierValue.TIER_FEATURES[this.tier];
    }
    hasFeature(featureId) {
        return this.features.features.includes(featureId);
    }
    canCreateUsers(currentUserCount) {
        const maxUsers = this.features.maxUsers;
        return maxUsers === -1 || currentUserCount < maxUsers;
    }
    canCreateAgencies(currentAgencyCount) {
        const maxAgencies = this.features.maxAgencies;
        return maxAgencies === -1 || currentAgencyCount < maxAgencies;
    }
    canAddDevices(currentDeviceCount) {
        const maxDevices = this.features.maxDevices;
        return maxDevices === -1 || currentDeviceCount < maxDevices;
    }
    getDisplayName() {
        switch (this.tier) {
            case SubscriptionTier.TRIAL:
                return 'Trial';
            case SubscriptionTier.BASIC:
                return 'Basic';
            case SubscriptionTier.PROFESSIONAL:
                return 'Professional';
            case SubscriptionTier.ENTERPRISE:
                return 'Enterprise';
            default:
                return 'Unknown';
        }
    }
    getDescription() {
        switch (this.tier) {
            case SubscriptionTier.TRIAL:
                return 'Try Flowlytix with limited features';
            case SubscriptionTier.BASIC:
                return 'Essential features for small businesses';
            case SubscriptionTier.PROFESSIONAL:
                return 'Advanced features for growing businesses';
            case SubscriptionTier.ENTERPRISE:
                return 'Complete solution for large organizations';
            default:
                return 'Unknown subscription tier';
        }
    }
    getColor() {
        switch (this.tier) {
            case SubscriptionTier.TRIAL:
                return '#9e9e9e'; // Gray
            case SubscriptionTier.BASIC:
                return '#2196f3'; // Blue
            case SubscriptionTier.PROFESSIONAL:
                return '#513ff2'; // Purple
            case SubscriptionTier.ENTERPRISE:
                return '#ff9800'; // Orange
            default:
                return '#9e9e9e'; // Gray
        }
    }
    isHigherThan(other) {
        return this.features.priority > other.features.priority;
    }
    isLowerThan(other) {
        return this.features.priority < other.features.priority;
    }
    equals(other) {
        return this.tier === other.tier;
    }
    toString() {
        return this.tier;
    }
}
