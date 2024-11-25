export function preparePagination(params: { page?: number; size?: number; total: number }) {
  const { page = 1, size = 12, total } = params;
  if (total < 1) {
    return {
      from: 0,
      meta: { total, size, page },
    };
  }
  // Рассчитываем общее количество записей до конца текущей страницы
  const calculatedTotal = size * page;

  // Проверяем, если запрашиваемая страница выходит за пределы допустимых значений
  if (calculatedTotal > total) {
    // Пересчитываем номер страницы с округлением вверх
    const recalculatedPageNumber = Math.ceil(total / size);

    return {
      from: (recalculatedPageNumber - 1) * size,
      meta: { total, size, page: recalculatedPageNumber },
    };
  }

  // Возвращаем начальный индекс выборки и метаданные для валидной запрашиваемой страницы
  return {
    from: (page - 1) * size,
    meta: { total, size, page },
  };
}

