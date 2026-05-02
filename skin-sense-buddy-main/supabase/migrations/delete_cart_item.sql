-- Create stored procedure for deleting cart items
CREATE OR REPLACE FUNCTION delete_cart_item(p_item_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete the cart item if it belongs to the user
  DELETE FROM public.cart_items
  WHERE id = p_item_id AND user_id = p_user_id;
  
  -- Get the number of affected rows
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Return the count (0 if not found, 1 if deleted)
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_cart_item(uuid, uuid) TO authenticated;
