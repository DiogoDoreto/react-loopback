var testsContext = require.context('./src', true, /-test\.jsx?$/);
testsContext.keys().forEach(testsContext);
