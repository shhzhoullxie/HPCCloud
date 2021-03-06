import values from 'mout/src/object/values';

import client from '../../network';
import * as SimulationHelper from '../../network/helpers/simulations';
import * as ProjectHelper from '../../network/helpers/projects';
import * as netActions from './network';
import * as taskflowActions from './taskflows';
import get from '../../utils/get';
import { store, dispatch } from '../';
import history from './history';

export const FETCH_PROJECT_LIST = 'FETCH_PROJECT_LIST';
export const UPDATE_PROJECT_LIST = 'UPDATE_PROJECT_LIST';
export const UPDATE_PROJECT_SIMULATIONS = 'UPDATE_PROJECT_SIMULATIONS';
export const REMOVE_PROJECT = 'REMOVE_PROJECT';
export const UPDATE_PROJECT = 'UPDATE_PROJECT';
export const REMOVE_SIMULATION = 'REMOVE_SIMULATION';
export const UPDATE_ACTIVE_PROJECT = 'UPDATE_ACTIVE_PROJECT';
export const UPDATE_ACTIVE_SIMULATION = 'UPDATE_ACTIVE_SIMULATION';
export const UPDATE_SIMULATION = 'UPDATE_SIMULATION';

/* eslint-disable no-shadow */

// ----------------------------------------------------------------------------
// PROJECTS
// ----------------------------------------------------------------------------
export function updateProjectList(projects) {
  return { type: UPDATE_PROJECT_LIST, projects };
}

export function updateProjectSimulations(id, simulations) {
  return { type: UPDATE_PROJECT_SIMULATIONS, id, simulations };
}

export function fetchProjectSimulations(id) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      `fetch_project_simulations_${id}`,
      'Retreive project simulations'
    );

    client
      .listSimulations(id)
      .then((resp) => {
        const simulations = resp.data;
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateProjectSimulations(id, simulations));
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error));
      });

    return action;
  };
}

export function fetchProjectList() {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'fetch_project_list',
      'Retreive projects'
    );

    client
      .listProjects()
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateProjectList(resp.data));
        resp.data.forEach((project) => {
          dispatch(fetchProjectSimulations(project._id));
        });
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error));
      });

    return action;
  };
}

export function deleteProject(project) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'delete_project',
      `Delete project ${project.name}`
    );

    client.deleteProject(project._id).then(
      (resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch({ type: REMOVE_PROJECT, project });
        history.push('/');
      },
      (error) => {
        dispatch(netActions.errorNetworkCall(action.id, error));
      }
    );

    return action;
  };
}

export function setActiveProject(id, location) {
  return (dispatch) => {
    const updateActive = { type: UPDATE_ACTIVE_PROJECT, id };

    if (location) {
      history.push(location);
    }
    return updateActive;
  };
}

export function updateProject(project) {
  return { type: UPDATE_PROJECT, project };
}

export function shareProject(project, users, groups) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'share_project',
      `Share project users: ${users}\ngroups: ${groups}`
    );
    client
      .patchProjectAccess(project._id, users, groups)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateProject(resp.data));
        // fetch all simulations and update their taskflow permissions
        const simulationIds = store.getState().projects.simulations[project._id]
          .list;
        const simulationsMap = store.getState().simulations.mapById;
        const taskflows = [];
        simulationIds.forEach((id) => {
          values(simulationsMap[id].steps).forEach((step) => {
            if (step.metadata.taskflowId) {
              taskflows.push(step.metadata.taskflowId);
            }
          });
        });
        return Promise.all(
          taskflows.map((id) => client.shareTaskflow(id, users, groups))
        );
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      });
    return action;
  };
}

export function unShareProject(project, users, groups) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'unshare_project',
      `Unshare project users: ${users}\ngroups: ${groups}`
    );
    client
      .revokeProjectAccess(project._id, users, groups)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateProject(resp.data));
        // fetch all simulations and update their taskflow permissions
        const simulationIds = store.getState().projects.simulations[project._id]
          .list;
        const simulationsMap = store.getState().simulations.mapById;
        const taskflows = [];
        simulationIds.forEach((id) => {
          values(simulationsMap[id].steps).forEach((step) => {
            if (step.metadata.taskflowId) {
              taskflows.push(step.metadata.taskflowId);
            }
          });
        });
        return Promise.all(
          taskflows.map((id) => client.unshareTaskflow(id, users, groups))
        );
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      });
    return action;
  };
}

export function updateProjectPermissions(project, users, groups, level) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'update_proj_permission',
      `update project permission: ${users}\ngroups: ${groups}\nlevel:${level}`
    );
    client
      .patchProjectAccess(project._id, users, groups, level)
      .then((resp) => {
        dispatch(updateProject(resp.data));
      });
    return action;
  };
}

export function saveProject(project, attachments) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'save_project',
      `Save project ${project.name}`
    );
    if (attachments && Object.keys(attachments).length) {
      dispatch(netActions.prepareUpload(attachments));
    }
    ProjectHelper.saveProject(project, attachments)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        const respWithProj = Array.isArray(resp) ? resp[resp.length - 1] : resp;
        dispatch(updateProject(respWithProj.data));
        if (attachments && Object.keys(attachments).length) {
          setTimeout(() => {
            history.push(`/View/Project/${respWithProj.data._id}`);
          }, 1500);
        } else if (project._id) {
          history.push('/');
        } else {
          history.push(`/View/Project/${respWithProj.data._id}`);
        }
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      });

    return action;
  };
}

// ----------------------------------------------------------------------------
// SIMULATIONS
// ----------------------------------------------------------------------------

export function updateSimulation(simulation) {
  return { type: UPDATE_SIMULATION, simulation };
}

export function saveSimulation(simulation, attachments, location) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'save_simulation',
      `Save simulation ${simulation.name}`
    );

    if (attachments && Object.keys(attachments).length) {
      dispatch(netActions.prepareUpload(attachments));
    }

    SimulationHelper.saveSimulation(simulation, attachments).then(
      (resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        const respWithSim = Array.isArray(resp) ? resp[resp.length - 1] : resp;
        dispatch(updateSimulation(respWithSim.data));
        if (location && attachments && Object.keys(attachments).length) {
          // in this 1.5s gap the progressBar will appear complete, and fade on the new page
          setTimeout(() => {
            history.push(location);
          }, 1500);
        } else if (location) {
          // `/View/Project/${respWithSim.data.projectId}`
          history.push(location);
        }
      },
      (error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      }
    );
    return action;
  };
}

function getTaskflowsFromSimulation(simulation) {
  const ret = [];
  Object.keys(simulation.steps).forEach((stepName) => {
    if (get(simulation.steps[stepName], 'metadata.taskflowId')) {
      ret.push(simulation.steps[stepName].metadata.taskflowId);
    }
  });
  return ret;
}

export function deleteSimulation(simulation, location) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      `delete_simulation_${simulation._id}`,
      `Delete simulation ${simulation.name}`
    );
    const simStepTaskflows = getTaskflowsFromSimulation(simulation);
    client.deleteSimulation(simulation._id).then(
      (resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch({ type: REMOVE_SIMULATION, simulation });
        if (location) {
          history.replace(location);
        }
        if (simStepTaskflows.length) {
          simStepTaskflows.forEach((taskflowId) => {
            dispatch(taskflowActions.deleteTaskflow(taskflowId));
          });
        }
      },
      (error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      }
    );

    return action;
  };
}

export function patchSimulation(simulation) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      `update_simulation_${simulation._id}`,
      `update simulation ${simulation.name}`
    );
    client
      .editSimulation(simulation)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateSimulation(resp.data));
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error));
      });
    return action;
  };
}

export function setActiveSimulation(id, location) {
  return (dispatch) => {
    const updateActive = { type: UPDATE_ACTIVE_SIMULATION, id };

    if (location) {
      history.push(location);
    }
    return updateActive;
  };
}

export function updateSimulationStep(id, stepName, data, location) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      `update_simulation_step_${id}`,
      'Update simulation step'
    );
    const state = store.getState().simulations.mapById[id];
    const stateTaskflowId = get(state, `steps.${stepName}.metadata.taskflowId`);

    if (
      stateTaskflowId &&
      stateTaskflowId !== get(data, 'metadata.taskflowId')
    ) {
      dispatch(taskflowActions.deleteTaskflow(stateTaskflowId));
    }

    client
      .updateSimulationStep(id, stepName, data)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateSimulation(resp.data));
        if (location) {
          history.replace(location);
        }
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error));
      });

    return action;
  };
}

export function shareSimulation(simulation, users, groups) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'share_simulation',
      `Share simulation users: ${users}\ngroups: ${groups}`
    );
    client.patchSimulationAccess(simulation._id, users, groups).then(
      (resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateSimulation(resp.data));
        const sharePromises = [];
        values(simulation.steps).forEach((el, i) => {
          if (el.metadata.taskflowId) {
            sharePromises.push(
              client.shareTaskflow(el.metadata.taskflowId, users, groups)
            );
          }
        });
        return Promise.all(sharePromises);
      },
      (error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      }
    );
    return action;
  };
}

export function unShareSimulation(simulation, users, groups) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'unshare_simulation',
      `Share simulation users: ${users}\ngroups: ${groups}`
    );
    client
      .revokeSimulationAccess(simulation._id, users, groups)
      .then((resp) => {
        dispatch(netActions.successNetworkCall(action.id, resp));
        dispatch(updateSimulation(resp.data));
        const sharePromises = [];
        values(simulation.steps).forEach((el, i) => {
          if (el.metadata.taskflowId) {
            sharePromises.push(
              client.unshareTaskflow(el.metadata.taskflowId, users, groups)
            );
          }
        });
        return Promise.all(sharePromises);
      })
      .catch((error) => {
        dispatch(netActions.errorNetworkCall(action.id, error, 'form'));
      });
    return action;
  };
}

export function updateSimulationPermissions(simulation, users, groups, level) {
  return (dispatch) => {
    const action = netActions.addNetworkCall(
      'update_sim_permission',
      `update simulation permission: ${users}\ngroups: ${groups}\nlevel:${level}`
    );
    client
      .patchSimulationAccess(simulation._id, users, groups, level)
      .then((resp) => {
        dispatch(updateSimulation(resp.data));
      });
    return action;
  };
}

// Auto trigger actions on authentication change...
client.onAuthChange((authenticated) => {
  if (authenticated) {
    dispatch(fetchProjectList());
  } else {
    dispatch(updateProjectList([]));
  }
});
