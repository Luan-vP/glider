/**
 * Unit tests for EvolutionDashboard component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvolutionDashboard } from '../EvolutionDashboard';
import { useVehicleStore } from '../../state/vehicle-store';
import * as apiClient from '../../api/client';
import type { GenerationResult, VehicleType } from '../../types/vehicle';

// Mock API client
vi.mock('../../api/client', () => ({
  runEvolution: vi.fn(),
  viewVehicle: vi.fn(),
}));

const mockVehicle: VehicleType = {
  vertices: [[0, 0, 0]],
  faces: [[0, 1, 2]],
  max_dim_m: 4.5,
  mass_kg: null,
  orientation: [0, 0, 0],
  wing_density: 0.4,
  pilot: false,
};

const mockGenerationResult: GenerationResult = {
  generation: 0,
  best_fitness: 10.5,
  avg_fitness: 5.2,
  best_vehicle: mockVehicle,
  population_fitness: [10.5, 8.3, 5.1, 3.2, 2.1],
};

describe('EvolutionDashboard', () => {
  beforeEach(() => {
    // Reset Zustand store
    useVehicleStore.setState({
      vehicle: mockVehicle,
      evolutionRunning: false,
      generations: [],
      previewLoading: false,
      previewImage: null,
      fitnessHistory: [],
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render configuration form with default values', () => {
      render(<EvolutionDashboard />);

      expect(screen.getByText('Evolution Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Evolution Configuration')).toBeInTheDocument();

      // Check default values
      expect(screen.getByLabelText(/Population Size/i)).toHaveValue(100);
      expect(screen.getByLabelText(/Number of Generations/i)).toHaveValue(10);
      expect(screen.getByLabelText(/Survival Weight/i)).toHaveValue(0.3);
      expect(screen.getByLabelText(/Cloning Weight/i)).toHaveValue(0.4);
    });

    it('should render Start Evolution and Stop buttons', () => {
      render(<EvolutionDashboard />);

      expect(screen.getByText('Start Evolution')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should show no data message when no generations exist', () => {
      render(<EvolutionDashboard />);

      expect(
        screen.getByText(/No evolution data yet. Configure parameters and click "Start Evolution" to begin./i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Configuration', () => {
    it('should update form values when inputs change', () => {
      render(<EvolutionDashboard />);

      const populationInput = screen.getByLabelText(/Population Size/i);
      const generationsInput = screen.getByLabelText(/Number of Generations/i);

      fireEvent.change(populationInput, { target: { value: '50' } });
      fireEvent.change(generationsInput, { target: { value: '20' } });

      expect(populationInput).toHaveValue(50);
      expect(generationsInput).toHaveValue(20);
    });

    it('should disable form inputs when evolution is running', () => {
      useVehicleStore.setState({ evolutionRunning: true });
      render(<EvolutionDashboard />);

      expect(screen.getByLabelText(/Population Size/i)).toBeDisabled();
      expect(screen.getByLabelText(/Number of Generations/i)).toBeDisabled();
      expect(screen.getByLabelText(/Survival Weight/i)).toBeDisabled();
      expect(screen.getByLabelText(/Cloning Weight/i)).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when weights sum exceeds 1.0', () => {
      render(<EvolutionDashboard />);

      const survivalInput = screen.getByLabelText(/Survival Weight/i);
      const cloningInput = screen.getByLabelText(/Cloning Weight/i);

      fireEvent.change(survivalInput, { target: { value: '0.6' } });
      fireEvent.change(cloningInput, { target: { value: '0.5' } });

      expect(screen.getByText(/Error: Survival Weight \+ Cloning Weight must be ≤ 1.0/i)).toBeInTheDocument();
    });

    it('should disable Start button when validation fails', () => {
      render(<EvolutionDashboard />);

      const survivalInput = screen.getByLabelText(/Survival Weight/i);
      const cloningInput = screen.getByLabelText(/Cloning Weight/i);
      const startButton = screen.getByText('Start Evolution');

      fireEvent.change(survivalInput, { target: { value: '0.7' } });
      fireEvent.change(cloningInput, { target: { value: '0.4' } });

      expect(startButton).toBeDisabled();
    });

    it('should enable Start button when validation passes', () => {
      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      expect(startButton).not.toBeDisabled();
    });
  });

  describe('Evolution Control', () => {
    it('should call runEvolution when Start Evolution is clicked', async () => {
      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockResolvedValue(undefined);

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockRunEvolution).toHaveBeenCalledWith(
          expect.objectContaining({
            population_size: 100,
            num_generations: 10,
            survival_weight: 0.3,
            cloning_weight: 0.4,
            max_dim_m: 4.5,
            pilot: false,
            mass_kg: null,
            wing_density: 0.4,
          }),
          expect.any(Function),
          expect.any(AbortSignal)
        );
      });
    });

    it('should clear generations when starting evolution', async () => {
      useVehicleStore.setState({ generations: [mockGenerationResult] });

      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockResolvedValue(undefined);

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().generations).toHaveLength(0);
      });
    });

    it('should set evolutionRunning to true when starting', async () => {
      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockImplementation(async () => {
        // Evolution is running
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().evolutionRunning).toBe(true);
      });
    });

    it('should add generation results to shared state via callback', async () => {
      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockImplementation(async (config, onGeneration) => {
        onGeneration(mockGenerationResult);
      });

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().generations).toHaveLength(1);
        expect(useVehicleStore.getState().generations[0]).toEqual(mockGenerationResult);
      });
    });

    it('should set evolutionRunning to false when evolution completes', async () => {
      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockResolvedValue(undefined);

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().evolutionRunning).toBe(false);
      });
    });

    it('should abort evolution when Stop is clicked', async () => {
      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      let abortCalled = false;

      mockRunEvolution.mockImplementation(async (config, onGeneration, signal) => {
        signal?.addEventListener('abort', () => {
          abortCalled = true;
        });
        // Simulate long-running evolution
        await new Promise((resolve) => setTimeout(resolve, 10000));
      });

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().evolutionRunning).toBe(true);
      });

      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(abortCalled).toBe(true);
      });
    });

    it('should disable Stop button when evolution is not running', () => {
      render(<EvolutionDashboard />);

      const stopButton = screen.getByText('Stop');
      expect(stopButton).toBeDisabled();
    });

    it('should enable Stop button when evolution is running', () => {
      useVehicleStore.setState({ evolutionRunning: true });
      render(<EvolutionDashboard />);

      const stopButton = screen.getByText('Stop');
      expect(stopButton).not.toBeDisabled();
    });
  });

  describe('Generation Display', () => {
    it('should display latest generation stats', () => {
      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      expect(screen.getByText(/Generation 0/i)).toBeInTheDocument();
      expect(screen.getByText(/10.50/i)).toBeInTheDocument(); // Best fitness
      expect(screen.getByText(/5.20/i)).toBeInTheDocument(); // Avg fitness
    });

    it('should display fitness over time chart when generations exist', () => {
      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      expect(screen.getByText('Fitness Over Time')).toBeInTheDocument();
    });

    it('should display population fitness distribution chart', () => {
      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      expect(screen.getByText(/Population Fitness Distribution/i)).toBeInTheDocument();
    });
  });

  describe('Load Best Button', () => {
    it('should load best vehicle into shared state when clicked', () => {
      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      const loadBestButton = screen.getByText('Load Best Vehicle');
      fireEvent.click(loadBestButton);

      expect(useVehicleStore.getState().vehicle).toEqual(mockGenerationResult.best_vehicle);
    });

    it('should not render Load Best button when no generations exist', () => {
      render(<EvolutionDashboard />);

      expect(screen.queryByText('Load Best Vehicle')).not.toBeInTheDocument();
    });
  });

  describe('Best Vehicle Preview', () => {
    it('should call viewVehicle when Show Preview is clicked', async () => {
      const mockViewVehicle = vi.mocked(apiClient.viewVehicle);
      mockViewVehicle.mockResolvedValue('base64imagedata');

      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      const showPreviewButton = screen.getByText('Show Best Vehicle Preview');
      fireEvent.click(showPreviewButton);

      await waitFor(() => {
        expect(mockViewVehicle).toHaveBeenCalledWith(mockGenerationResult.best_vehicle);
      });
    });

    it('should display preview image after loading', async () => {
      const mockViewVehicle = vi.mocked(apiClient.viewVehicle);
      mockViewVehicle.mockResolvedValue('base64imagedata');

      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      const showPreviewButton = screen.getByText('Show Best Vehicle Preview');
      fireEvent.click(showPreviewButton);

      await waitFor(() => {
        const image = screen.getByAltText('Best vehicle');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'data:image/png;base64,base64imagedata');
      });
    });

    it('should show loading state while fetching preview', async () => {
      const mockViewVehicle = vi.mocked(apiClient.viewVehicle);
      mockViewVehicle.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'base64imagedata';
      });

      useVehicleStore.setState({ generations: [mockGenerationResult] });

      render(<EvolutionDashboard />);

      const showPreviewButton = screen.getByText('Show Best Vehicle Preview');
      fireEvent.click(showPreviewButton);

      expect(screen.getByText('Loading Preview...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading Preview...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should handle full evolution workflow with multiple generations', async () => {
      const gen0 = { ...mockGenerationResult, generation: 0, best_fitness: 10.0, avg_fitness: 5.0 };
      const gen1 = { ...mockGenerationResult, generation: 1, best_fitness: 12.0, avg_fitness: 6.0 };
      const gen2 = { ...mockGenerationResult, generation: 2, best_fitness: 15.0, avg_fitness: 7.5 };

      const mockRunEvolution = vi.mocked(apiClient.runEvolution);
      mockRunEvolution.mockImplementation(async (config, onGeneration) => {
        onGeneration(gen0);
        onGeneration(gen1);
        onGeneration(gen2);
      });

      render(<EvolutionDashboard />);

      const startButton = screen.getByText('Start Evolution');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(useVehicleStore.getState().generations).toHaveLength(3);
      });

      // Check that latest generation is displayed
      expect(screen.getByText(/Generation 2/i)).toBeInTheDocument();
      expect(screen.getByText(/15.00/i)).toBeInTheDocument();
    });
  });
});
