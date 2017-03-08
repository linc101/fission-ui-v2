import { take, call, put, cancel, takeLatest } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import v4 from 'uuid';
import { LOCATION_CHANGE } from 'react-router-redux';
import { browserHistory } from 'react-router';
import { postFunction, postTriggerHttp, restRequest, removeTriggerHttp, removeFunction } from 'utils/api';
import {
  CREATE_FUNCTION_REQUEST,
  CREATE_FUNCTION_SUCCESS,
  CREATE_FUNCTION_ERROR,
  TEST_FUNCTION_REQUEST,
  TEST_FUNCTION_SUCCESS,
  TEST_FUNCTION_ERROR,
} from 'containers/FunctionsPage/constants';

function* createFunction(action) {
  try {
    yield call(postFunction, action.fn);

    yield put({ type: CREATE_FUNCTION_SUCCESS, data: action.fn });

    // TODO if function is created successfully, jump to the function's edit page
    // the following code works, but not sure it is the best solution
    browserHistory.push(`/functions/${action.fn.name}`);
  } catch (error) {
    yield put({ type: CREATE_FUNCTION_ERROR, error });
  }
}
function* testFunction(action) {
  const { fn } = action;
  const { method, headers, params, payload } = fn.test;
  const url = `/ui-test/${fn.name}`;
  const httptrigger = {
    metadata: { name: v4() },
    method,
    urlpattern: url,
    function: { name: fn.name },
  };

  try {
    yield call(postFunction, fn);
    yield call(postTriggerHttp, httptrigger);

    yield delay(4 * 1000);
    const data = yield call(restRequest, url, method, headers, params, payload);

    yield call(removeTriggerHttp, httptrigger);
    yield call(removeFunction, fn);

    yield put({ type: TEST_FUNCTION_SUCCESS, data });
  } catch (error) {
    yield put({ type: TEST_FUNCTION_ERROR, error });
  }
}

export function* createFunctionSaga() {
  const watcher = yield takeLatest(CREATE_FUNCTION_REQUEST, createFunction);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(watcher);
}
export function* testFunctionSaga() {
  const watcher = yield takeLatest(TEST_FUNCTION_REQUEST, testFunction);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(watcher);
}

// All sagas to be loaded
export default [
  createFunctionSaga,
  testFunctionSaga,
];
