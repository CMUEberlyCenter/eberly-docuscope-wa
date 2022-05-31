var coherenceData={
    "num_topics": 17,                                            // total # of topics
    "num_paras": 7,                                              // total # of paragraphs 
    "data": [                                                    // list of topics
        {
            "is_topic_cluster": true,                            // Is it a topic cluster?
            "is_non_local": false,                               // if true, it is not really a global topic, but it's entered by the user. Show a small circle
            "topic": [                                           // a topic or a topic cluster. Use the 3rd element for the header column.
                "NOUN",
                "CF",
                "Cystic_Fibrosis"
            ],            
            "paragraphs": [                                       // list of paragraphs
                {
                    "para_pos": 0,                                // paragraph id. The dictionary is ordered; so it's not really needed.
                    "first_left_sent_id": 0,                      // Not used by the visualization. It's the sentence position of the first left side occurence.
                    "is_left": true,                              // Is this topic at least once on the left side of the main verb?
                    "is_topic_sent": true                         // Does this toppic appear in a topic sentence?
                },
                {
                    "para_pos": 1,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                {
                    "para_pos": 2,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                {
                    "para_pos": 3,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                {
                    "para_pos": 4,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                {
                    "first_left_sent_id": 1,
                    "para_pos": 5,
                    "is_left": true,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": true
                },
                null                                              // if an item is null, this topic is not used in this paragraph.
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": true
                },
                null,
                null,
                null,
                {
                    "para_pos": 4,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                null,
                {
                    "para_pos": 6,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": true
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "genetic",
                "Genetic_Disease"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": true
                },
                {
                    "para_pos": 1,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                {
                    "para_pos": 2,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null,
                {
                    "para_pos": 4,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                {
                    "first_left_sent_id": 6,
                    "para_pos": 5,
                    "is_left": true,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "patients",
                "Patient"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                {
                    "first_left_sent_id": 2,
                    "para_pos": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null,
                null,
                null,
                {
                    "para_pos": 5,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": true
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "symptoms",
                "Symptom"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null,
                {
                    "first_left_sent_id": 2,
                    "para_pos": 2,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null,
                null,
                {
                    "para_pos": 5,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "lifespans",
                "Lifespan"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null,
                {
                    "para_pos": 2,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 3,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                null,
                null,
                {
                    "para_pos": 6,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "diagnosis",
                "Diagnosis"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null,
                {
                    "para_pos": 2,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 3,
                    "first_left_sent_id": 0,
                    "is_left": true,
                    "is_topic_sent": true
                },
                null,
                {
                    "para_pos": 5,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "treatment",
                "Treatment"
            ]
        },
        {
            "paragraphs": [
                {
                    "para_pos": 0,
                    "first_left_sent_id": -1,
                    "is_left": false,
                    "is_topic_sent": false
                },
                null,
                null,
                null,
                null,
                {
                    "first_left_sent_id": 9,
                    "para_pos": 5,
                    "is_left": true,
                    "is_topic_sent": false
                },
                {
                    "para_pos": 6,
                    "first_left_sent_id": 1,
                    "is_left": true,
                    "is_topic_sent": false
                },
                null
            ],
            "is_topic_cluster": true,
            "is_non_local": false,
            "topic": [
                "NOUN",
                "cures",
                "Cure"
            ]
        }
    ]
};

export { coherenceData };
