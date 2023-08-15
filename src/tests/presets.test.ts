import {Controller} from '../controller';
import {getAnchorElement, getOptions, getOptionsWithHooks, waitForNextTick} from './utils';

describe('preset management', function () {
    describe('add preset', function () {
        it('add preset -> save base state', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            await controller.addPreset('createQueue');

            const newState = options.onSave.state.mock.calls[0][0];

            expect(newState.availablePresets).toEqual(['createProject', 'createQueue']);
        });

        it('add same preset -> not duplicate', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            await controller.addPreset('createQueue');
            await controller.addPreset('createQueue');

            const newState =
                options.onSave.state.mock.calls[options.onSave.state.mock.calls.length - 1][0];

            expect(newState.availablePresets).toContain('createQueue');
        });

        it('preset not from config -> nothing', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            // @ts-ignore
            await controller.addPreset('createQueue123');

            expect(options.onSave.state).not.toHaveBeenCalled();
            expect(options.onSave.progress).not.toHaveBeenCalled();
        });

        it('add preset -> calls onAddPreset', async function () {
            const options = getOptionsWithHooks();

            const controller = new Controller(options);
            await controller.addPreset('createQueue');

            expect(options.hooks.onAddPreset).toHaveBeenCalledWith({
                preset: 'createQueue',
            });
        });
    });

    describe('run preset', function () {
        let options = getOptions({availablePresets: ['createProject', 'createBoard']});

        beforeEach(() => {
            options = getOptions({availablePresets: ['createProject', 'createBoard']});
        });

        it('run preset -> adds in active presets', async function () {
            const controller = new Controller(options);
            await controller.runPreset('createQueue');

            const newState = options.onSave.state.mock.calls[0][0];

            expect(newState.activePresets).toEqual(['createProject', 'createQueue']);
            expect(newState.suggestedPresets).toEqual(['createProject', 'createQueue']);
        });

        it('run same preset -> not duplicate', async function () {
            const controller = new Controller(options);
            await controller.runPreset('createQueue');
            await controller.runPreset('createQueue');

            const newState =
                options.onSave.state.mock.calls[options.onSave.state.mock.calls.length - 1][0];

            expect(newState.activePresets).toEqual(['createProject', 'createQueue']);
        });

        it('preset not from config -> nothing', async function () {
            const controller = new Controller(options);
            // @ts-ignore
            await controller.runPreset('createQueue123');

            expect(options.onSave.state).not.toHaveBeenCalled();
            expect(options.onSave.progress).not.toHaveBeenCalled();
        });

        it('start preset -> calls onStart', async function () {
            const mock = jest.fn();
            // @ts-ignore
            options.config.presets.createQueue.hooks = {onStart: mock};

            const controller = new Controller(options);
            await controller.runPreset('createQueue');

            expect(mock).toHaveBeenCalled();
        });

        it('run preset -> show hint for existing element', async function () {
            options.baseState.activePresets = [];

            const controller = new Controller(options);
            await controller.stepElementReached({
                stepSlug: 'createSprint',
                element: getAnchorElement(),
            });

            await controller.runPreset('createProject');
            await waitForNextTick();

            await expect(options.showHint).toHaveBeenCalled();
        });

        it('can run unavailable preset', async function () {
            const controller = new Controller(options);
            await controller.runPreset('createQueue');

            const newState = options.onSave.state.mock.calls[0][0];

            expect(newState.availablePresets).toContain('createQueue');
            expect(newState.activePresets).toContain('createQueue');
        });
    });

    describe('finish preset', function () {
        it('finish preset -> add to finished', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            await controller.finishPreset('createProject');

            const newBaseState = options.onSave.state.mock.calls[0][0];
            const newProgressState = options.onSave.progress.mock.calls[0][0];

            expect(newBaseState.activePresets).toEqual([]);
            expect(newProgressState.finishedPresets).toEqual(['createProject']);
        });

        it('finish same preset -> not duplicate', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            await controller.finishPreset('createProject');
            await controller.finishPreset('createProject');

            const newProgressState = options.onSave.progress.mock.calls[1][0];

            expect(newProgressState.finishedPresets).toEqual(['createProject']);
        });

        it('finish preset -> calls enEnd', async function () {
            const options = getOptions();
            const mock = jest.fn();
            // @ts-ignore
            options.config.presets.createProject.hooks = {onEnd: mock};

            const controller = new Controller(options);
            await controller.finishPreset('createProject');

            expect(mock).toHaveBeenCalled();
        });

        it('finish preset -> stay in suggested', async function () {
            const options = getOptions();

            const controller = new Controller(options);
            await controller.finishPreset('createProject');

            const newBaseState = options.onSave.state.mock.calls[0][0];

            expect(newBaseState.suggestedPresets).toEqual(['createProject']);
        });
    });

    it('reset preset -> remove progress, remove from finished', async function () {
        const options = getOptions({}, {finishedPresets: ['createQueue']});

        const controller = new Controller(options);
        await controller.resetPresetProgress(['createProject', 'createQueue']);

        const newProgressState = options.onSave.progress.mock.calls[0][0];

        // remove createQueue from finished
        expect(newProgressState.finishedPresets).toEqual([]);

        // remove createProject passed steps
        expect(newProgressState.presetPassedSteps.createProject).toEqual([]);

        const newBaseState = options.onSave.state.mock.calls[0][0];
        // remove createProject from suggested presets
        expect(newBaseState.suggestedPresets).toEqual([]);
    });
});

describe('suggest once', function () {
    it('first preset run -> runs', async function () {
        const options = getOptions({wizardState: 'hidden'});

        const controller = new Controller(options);
        await controller.suggestPresetOnce('createQueue');

        const newState = options.onSave.state.mock.calls[0][0];

        expect(newState.wizardState).toBe('visible');
    });

    it('call -> add preset', async function () {
        const options = getOptions();

        const controller = new Controller(options);
        await controller.suggestPresetOnce('createQueue');

        const newState = options.onSave.state.mock.calls[0][0];

        expect(newState.activePresets).toEqual(['createProject', 'createQueue']);
    });

    it('second run -> nothing', async function () {
        const options = getOptions({wizardState: 'hidden'});

        const controller = new Controller(options);
        await controller.suggestPresetOnce('createQueue');
        await controller.setWizardState('hidden');

        await controller.suggestPresetOnce('createQueue');

        expect(controller.state.base.wizardState).toBe('hidden');
    });
});
