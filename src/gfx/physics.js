/**
 * Physics utilities for space travel
 */

const PhysicsUtils = (() => {
    function applyAcceleration(velocity, direction, accel, dt) {
        return ThreeDUtils.addVec(velocity, ThreeDUtils.scaleVec(direction, accel * dt));
    }

    function applyBrake(velocity, accel, dt) {
        const currentSpeed = ThreeDUtils.vecLength(velocity);
        if (currentSpeed <= 0) {
            return velocity;
        }
        const decel = accel * dt;
        if (currentSpeed <= decel) {
            return { x: 0, y: 0, z: 0 };
        }
        const brakeDir = ThreeDUtils.normalizeVec(velocity);
        return ThreeDUtils.subVec(velocity, ThreeDUtils.scaleVec(brakeDir, decel));
    }

    function clampSpeed(velocity, maxSpeed) {
        const speed = ThreeDUtils.vecLength(velocity);
        if (speed > maxSpeed) {
            return ThreeDUtils.scaleVec(velocity, maxSpeed / speed);
        }
        return velocity;
    }

    return {
        applyAcceleration,
        applyBrake,
        clampSpeed
    };
})();
