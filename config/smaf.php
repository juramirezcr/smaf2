<?php

return [
    'version' => trim(file_get_contents(base_path('VERSION'))),
    'admin_email' => env('SMAF_ADMIN_EMAIL'),
    'github_repository' => env('GITHUB_REPOSITORY', 'juramirezcr/smaf2'),
];
