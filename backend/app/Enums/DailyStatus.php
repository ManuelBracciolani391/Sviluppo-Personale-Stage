<?php

namespace App\Enums;

enum DailyStatus: string
{
    case Pending = 'pending';
    case Done = 'done';
    case Skipped = 'skipped';
}