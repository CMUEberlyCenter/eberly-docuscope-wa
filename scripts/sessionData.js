/*
 * This script aggregates session data from the logging collection.
 * Pipe this to mongosh to execute it.  See sessionData.sh.
 */

const result = db.logging.aggregate([
  {
    $group: {
      _id: {
        sessionId:
          "$performance_data.session_id",
        prompt: "$meta.prompt"
      },
      count: {
        $sum: 1
      },
      timestamp: { $first: "$timestamp" },
      cache_creation_input_tokens: {
        $sum: '$performance_data.usage.cache_creation_input_tokens',
      },
      cache_read_input_tokens: {
        $sum: '$performance_data.usage.cache_read_input_tokens',
      },
      input_tokens: {
        $sum: '$performance_data.usage.input_tokens',
      },
      output_tokens: {
        $sum: '$performance_data.usage.output_tokens',
      }
    }
  },
  {
    $group: {
      _id: "$_id.sessionId",
      prompts: {
        $push: {
          prompt: "$_id.prompt",
          count: "$count",
          timestamp: "$timestamp",
          cache_creation_input_tokens: "$cache_creation_input_tokens",
          cache_read_input_tokens: "$cache_read_input_tokens",
          input_tokens: "$input_tokens",
          output_tokens: "$output_tokens",
        }
      },
      input_tokens: {
        $sum: '$input_tokens',
      },
      output_tokens: {
        $sum: '$output_tokens',
      },
      cache_creation_input_tokens: {
        $sum: '$cache_creation_input_tokens',
      },
      cache_read_input_tokens: {
        $sum: '$cache_read_input_tokens',
      },
    }
  }
]).toArray();
print(EJSON.stringify(result, null, 2));