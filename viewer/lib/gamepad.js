export class GamepadService {
    preciseMouseInput = false;
    mouseSensX = 0.5;
    mouseSensY = 0.5;
    lastCamUpdate = 0;

    controlsState = {
        back: false,
        forward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        sneak: false,
    };
    usingGamepadInput = false;
    lastMouseMove = 0;
    camera = { pitch: 0, yaw: 0 };
    isSneaking = false;

    emitter;

    contro = new (require('contro-max/build/controMax').ControMax)(
        {
            commands: {
                movement: {
                    forward: ['KeyW'],
                    back: ['KeyS'],
                    left: ['KeyA'],
                    right: ['KeyD'],
                    jump: ['Space', 'A'],
                    sneak: ['ShiftLeft', 'Down'],
                    toggleSneakOrDown: [null, 'Right Stick'],
                    sprint: ['ControlLeft', 'Left Stick'],
                },
                general: {
                    inventory: ['KeyE', 'X'],
                    drop: ['KeyQ', 'B'],
                    nextHotbarSlot: [null, 'Right Bumper'],
                    prevHotbarSlot: [null, 'Left Bumper'],
                    attackDestroy: [null, 'Right Trigger'],
                    interactPlace: [null, 'Left Trigger'],
                    selectItem: ['KeyH'],
                },
            },
            movementVector: '2d',
        },
        {
            defaultControlOptions: { preventDefault: true },
            target: window.document,
            captureEvents() {
                return true;
            },
            storeProvider: {
                load: () => {
                    return {};
                },
                save() { },
            },
            gamepadPollingInterval: 10,
        }
    );

    constructor() {
        setTimeout(() => {
            this.contro.on('trigger', (data) => this.onTrigger(data));
            this.contro.on('triggerGrouped', (data) => this.onTriggerGrouped(data));
            this.contro.on('release', (data) => this.onRelease(data));
            this.contro.on('onReleaseGrouped', (data) => this.onReleaseGrouped(data));
            this.contro.on('movementUpdate', ({ vector, soleVector, gamepadIndex }) =>
                this.onMovementUpdate(vector, soleVector, gamepadIndex)
            );
            this.contro.on('onMouseWheel', ({ direction }) => this.onMouseWheel(direction));
            this.contro.on('pressedKeyOrButtonChanged', (data) => this.onPressedKeyOrButtonChanged(data));
            this.contro.on('stickMovement', ({ stick, vector }) => this.onStickMovement(stick, vector));
        });
    }

    listen (emitter) {
        this.emitter = emitter;
    }
    updateCamera({ pitch, yaw }) {
        if (this.camera.pitch === pitch && this.camera.yaw === yaw){
            this.camera = { pitch, yaw };
        };

        if(this.camera.pitch !== 0 || this.camera.yaw !== 0){
            this.onUpdate();
        }
    }

    updateControlsState(changes) {
        let hasChanges = false;
        for (const key in changes) {
            hasChanges =
                hasChanges ||
                this.controlsState[key] !== changes[key];
        }

        if (hasChanges) {
            this.controlsState = { ...this.controlsState, ...changes };
            this.onUpdate();
        }
    }

    onUpdate() {
        console.log('onUpdate', this.controlsState, this.camera);
        this.emitter.emit('gamepad', {controlsState: this.controlsState, camera: this.camera});
    }

    onTrigger({ command }) {
        if (command.startsWith('movement')) {
            switch (command) {
                case 'movement.jump':
                    this.updateControlsState({ jump: true });
                    break;
                case 'movement.sneak':
                    this.isSneaking = true;
                    this.updateControlsState({ sneak: true });
                    break;
                case 'movement.toggleSneakOrDown':
                    this.isSneaking = !this.isSneaking;
                    this.updateControlsState({ sneak: this.isSneaking });
                    break;
                case 'movement.sprint':
                    this.updateControlsState({ sprint: true });
                    break;
                case 'movement.forward':
                    this.updateControlsState({ forward: true });
                    break;
                case 'movement.back':
                    this.updateControlsState({ back: true });
                    break;
                case 'movement.left':
                    this.updateControlsState({ left: true });
                    break;
                case 'movement.right':
                    this.updateControlsState({ right: true });
                    break;
            }
        }
        //console.log('trigger', command);
    }
    onTriggerGrouped(data) {
        //console.log('triggerGrouped', data);
    }

    onRelease({ command }) {
        if (command.startsWith('movement')) {
            switch (command) {
                case 'movement.jump':
                    this.updateControlsState({ jump: false });
                    break;
                case 'movement.sneak':
                    this.updateControlsState({ sneak: false });
                    break;
                case 'movement.toggleSneakOrDown':
                    break;
                case 'movement.sprint':
                    this.updateControlsState({ sprint: false });
                    break;
                case 'movement.forward':
                    this.updateControlsState({ forward: false });
                    break;
                case 'movement.back':
                    this.updateControlsState({ back: false });
                    break;
                case 'movement.left':
                    this.updateControlsState({ left: false });
                    break;
                case 'movement.right':
                    this.updateControlsState({ right: false });
                    break;
            }
        }
    }
    onReleaseGrouped(data) {
        //console.log('releaseGrouped', data);
    }

    onStickMovement(stick, vector) {
        if (stick !== 'right') return;
        let { x, z } = vector;
        if (Math.abs(x) < 0.18) x = 0;
        if (Math.abs(z) < 0.18) z = 0;

        this.onCameraMove({
            movementX: x * 10,
            movementY: z * 10,
            type: 'stickMovement',
            stopPropagation() { },
        });

        this.usingGamepadInput = true;
    }

    onMovementUpdate(
        vector,
        soleVector,
        gamepadIndex
    ) {
        const coordToAction = [
            ['z', -1, 'forward'],
            ['z', 1, 'back'],
            ['x', -1, 'left'],
            ['x', 1, 'right'],
        ];

        const newState = {};
        for (const [coord, v] of Object.entries(vector)) {
            if (v === undefined || Math.abs(v) < 0.3) continue;
            const mappedValue = v < 0 ? -1 : 1;
            const foundAction = coordToAction.find(
                ([c, mapV]) => c === coord && mapV === mappedValue
            )?.[2];
            newState[foundAction] = true;
        }

        this.updateControlsState({
            forward: !!newState.forward,
            back: !!newState.back,
            left: !!newState.left,
            right: !!newState.right,
            sprint: newState.forward ? this.controlsState.sprint : false,
        });
    }
    onMouseWheel(direction) {
        //console.log('onMouseWheel', direction);
    }

    onPressedKeyOrButtonChanged(data) {
        //console.log('pressedKeyOrButtonChanged');
    }

    onCameraMove(e) {
        if (e.type === 'mousemove' && !document.pointerLockElement) return;
        e.stopPropagation?.();

        const now = performance.now();
        if (now - this.lastMouseMove < 4 && !this.preciseMouseInput) return;
        this.lastMouseMove = now;

        this.moveCameraRawHandler({
            x: e.movementX * this.mouseSensX * 0.0001,
            y: e.movementY * this.mouseSensY * 0.0001,
        });
    }

    moveCameraRawHandler({ x, y }) {
        const maxPitch = 0.5 * Math.PI;
        const minPitch = -0.5 * Math.PI;
        this.lastCamUpdate = Date.now();

        this.updateCamera({ pitch: -y, yaw: -x });
    }
}
